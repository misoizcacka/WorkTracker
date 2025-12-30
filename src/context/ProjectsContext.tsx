import React, { createContext, useState, useCallback, useContext, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { decode } from 'base64-arraybuffer';
import { v4 as uuidv4 } from 'uuid';
import { Platform } from 'react-native';
import { compressImageAsync } from '../utils/imageCompression'; // Import the new compression utility // Added Platform import

// Keep this for native platforms
import { readAsStringAsync } from 'expo-file-system/legacy';



// --- Helper function for platform-specific file reading ---
const readAsBase64 = async (uri: string): Promise<string> => {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result.split(',')[1]); // Extract base64 part
        } else {
          reject(new Error("Failed to read blob as data URL."));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } else {
    // Native platforms (iOS/Android)
    return readAsStringAsync(uri, { encoding: 'base64' });
  }
};

// --------- TYPE DEFINITIONS --------- //


export interface Project {
  id: string;
  name: string;
  address: string;
  location: {
    latitude: number;
    longitude: number;
  };
  lastModified: string;
  photos: string[]; // Supabase URLs
  explanation: string;
  notes: string;
  color: string;
}

export interface ProjectMessage {
  id: string;
  project_id: string;
  sender_id: string;
  type: 'text' | 'image';
  text: string | null;
  image_url: string | null;
  created_at: string;
  employees: {
    full_name: string;
    avatar_url: string | null;
  } | null;
}

export interface ProjectsContextType {
  projects: Project[];
  loadInitialProjects: () => Promise<void>;
  createProject: (projectData: Omit<Project, 'id' | 'lastModified' | 'photos'> & { photos: string[] }) => Promise<Project | undefined>;
  getProjectMessages: (projectId: string, limit: number, beforeTimestamp?: string) => Promise<{ messages: ProjectMessage[]; hasMore: boolean; }>;
  sendTextMessage: (projectId: string, text: string) => Promise<ProjectMessage | undefined>;
  sendImageMessage: (projectId: string, imageUri: string) => Promise<ProjectMessage | undefined>;
  isLoading: boolean;
  error: string | null;
}

export const ProjectsContext = createContext<ProjectsContextType | null>(null);

const PAGE_SIZE = 50;

// --------- PROVIDER COMPONENT --------- //

export function ProjectsProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);


  const loadInitialProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch all projects
      const { data, error: fetchError } = await supabase
        .from('projects')
        .select(`*, project_photos ( url )`)
        .order('created_at', { ascending: false });

      if (fetchError) throw new Error(`Failed to fetch projects: ${fetchError.message}`);
      
      const mappedProjects: Project[] = data.map((p: any) => ({
        ...p,
        photos: p.project_photos.map((photo: { url: string }) => photo.url),
        lastModified: p.created_at,
        location: { latitude: p.latitude, longitude: p.longitude },
      }));

      setProjects(mappedProjects);

    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createProject = async (
    projectData: Omit<Project, 'id' | 'lastModified' | 'photos'> & { photos: string[] }
  ): Promise<Project | undefined> => {
    setIsLoading(true);
    setError(null);
    const newProjectId = uuidv4();
    try {
      if (projectData.photos.length > 10) throw new Error('You can only upload a maximum of 10 photos.');
      const uploadedPhotoUrls: string[] = await Promise.all(
        projectData.photos.map(async (photoUri) => {
          const compressedUri = await compressImageAsync(photoUri);
          const base64 = await readAsBase64(compressedUri);
          const filePath = `${newProjectId}/${Date.now()}.jpeg`;
          const { data, error: uploadError } = await supabase.storage
            .from('project-images')
            .upload(filePath, decode(base64), { contentType: 'image/jpeg' });
          if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);
                      const { data: urlData } = supabase.storage.from('project-images').getPublicUrl(data.path);
                      console.log('Uploaded image public URL:', urlData.publicUrl); // DEBUG LOG
                      return urlData.publicUrl;        })
      );
      const { error: rpcError } = await supabase.rpc('create_project_with_photos', {
        project_id_in: newProjectId,
        name_in: projectData.name,
        address_in: projectData.address,
        explanation_in: projectData.explanation,
        notes_in: projectData.notes,
        color_in: projectData.color,
        latitude_in: projectData.location.latitude,
        longitude_in: projectData.location.longitude,
        photo_urls_in: uploadedPhotoUrls,
      });
      if (rpcError) throw new Error(`Failed to create project: ${rpcError.message}`);
      // After creating, we should probably refetch to keep the list consistent
      loadInitialProjects();
      return { ...projectData, id: newProjectId, photos: uploadedPhotoUrls, lastModified: new Date().toISOString() };
    } catch (e: any) {
      setError(e.message);
      return undefined;
    } finally {
      setIsLoading(false);
    }
  };

  const getProjectMessages = async (projectId: string, limit: number, beforeTimestamp?: string): Promise<{ messages: ProjectMessage[]; hasMore: boolean; }> => {
    if (!projectId) return { messages: [], hasMore: false };

    const { data, error } = await supabase.rpc('get_messages_for_project', {
      p_id: projectId,
      _limit: limit + 1, // Fetch one more to check if there are more pages
      _before_timestamp: beforeTimestamp
    });
    
    if (error) throw new Error(`Failed to fetch messages: ${error.message}`);
    
    const fetchedMessages = data || [];
    const hasMore = fetchedMessages.length > limit;
    const messages = hasMore ? fetchedMessages.slice(0, limit) : fetchedMessages;

    return { messages, hasMore };
  };

  const sendTextMessage = async (projectId: string, text: string): Promise<ProjectMessage | undefined> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('You must be logged in to send a message.');
    const messageToInsert = { project_id: projectId, sender_id: user.id, type: 'text' as const, text: text };
    const { data, error } = await supabase.from('project_messages').insert(messageToInsert).select().single();
    if (error) throw new Error(`Failed to send message: ${error.message}`);
    return data;
  };

  const sendImageMessage = async (projectId: string, imageUri: string): Promise<ProjectMessage | undefined> => {
    const { data: { user } } = await supabase.auth.getUser();
    const session = await supabase.auth.getSession();
    console.log(JSON.stringify(session.data.session, null, 2));
    if (!user) throw new Error('You must be logged in to send an image.');
    const messageId = uuidv4();
    const filePath = `${projectId}/${messageId}.jpeg`;
    const compressedUri = await compressImageAsync(imageUri);
    const base64 = await readAsBase64(compressedUri);
    const { error: uploadError } = await supabase.storage.from('project-message-images').upload(filePath, decode(base64), { contentType: 'image/jpeg' });
    if (uploadError) {
      console.error("Supabase storage upload error details:", uploadError);
      throw new Error(`Image upload failed: ${uploadError.message}`);
    }
    const { data: urlData } = supabase.storage.from('project-message-images').getPublicUrl(filePath);
    const messageToInsert = { id: messageId, project_id: projectId, sender_id: user.id, type: 'image' as const, image_url: urlData.publicUrl };
    const { data, error } = await supabase.from('project_messages').insert(messageToInsert).select().single();
    if (error) throw new Error(`Failed to save image message: ${error.message}`);
    return data;
  };

  useEffect(() => {
    loadInitialProjects();
  }, [loadInitialProjects]);

  return (
    <ProjectsContext.Provider value={{ projects, loadInitialProjects, createProject, getProjectMessages, sendTextMessage, sendImageMessage, isLoading, error }}>
      {children}
    </ProjectsContext.Provider>
  );
}

export function useProjects() {
  const context = useContext(ProjectsContext);
  if (!context) throw new Error('useProjects must be used within a ProjectsProvider');
  return context;
}