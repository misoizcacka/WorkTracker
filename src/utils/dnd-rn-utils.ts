import { DraggableProvided, DroppableProvided } from '@hello-pangea/dnd';
import { View, ScrollView } from 'react-native';

// Helper to clean web-specific props from draggableProps
export const cleanDraggableProps = (draggableProps: DraggableProvided['draggableProps']) => {
  const cleanedProps: { [key: string]: any } = { ...draggableProps };

  // Remove web-specific style properties
  if (cleanedProps.style) {
    delete cleanedProps.style.position;
    delete cleanedProps.style.left;
    delete cleanedProps.style.top;
    delete cleanedProps.style.width; // Re-enabled
    delete cleanedProps.style.height; // Re-enabled
  }

  // Remove web-specific attributes
  delete cleanedProps.role;
  delete cleanedProps.tabIndex;
  delete cleanedProps['data-rfd-draggable-context-id'];
  delete cleanedProps['data-rfd-draggable-id'];

  return cleanedProps;
};

// Helper to clean web-specific props from droppableProps
export const cleanDroppableProps = (droppableProps: DroppableProvided['droppableProps']) => {
  const cleanedProps: { [key: string]: any } = { ...droppableProps };

  // Remove web-specific attributes
  delete cleanedProps.role;
  delete cleanedProps.tabIndex;
  delete cleanedProps['data-rfd-droppable-context-id'];
  delete cleanedProps['data-rfd-droppable-id'];

  return cleanedProps;
};

// Helper to create a ref function that correctly forwards to provided.innerRef
export const createReactNativeRef = (providedInnerRef: (element: HTMLElement | null) => any) => {
  return (element: any) => { // Use 'any' for broader compatibility
    providedInnerRef(element);
  };
};