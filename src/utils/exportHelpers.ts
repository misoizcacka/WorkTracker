import * as XLSX from '@e965/xlsx';
import { Paths, File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { Platform } from 'react-native';

export const exportToExcel = async (data: any[], fileName: string) => {
  try {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

    if (Platform.OS === 'web') {
      XLSX.writeFile(wb, `${fileName}.xlsx`);
    } else {
      const wbout = XLSX.write(wb, {
        type: 'base64',
        bookType: 'xlsx',
      });
      
      const file = new File(Paths.cache, `${fileName}.xlsx`);
      file.write(wbout, {
        encoding: 'base64',
      });
      
      await Sharing.shareAsync(file.uri);
    }
  } catch (error) {
    console.error('Excel Export Error:', error);
    throw error;
  }
};

export const exportToPDF = async (html: string, fileName: string) => {
  try {
    const { uri } = await Print.printToFileAsync({ html });
    if (Platform.OS === 'web') {
      // Print dialog usually opens on web. 
      // If we want a direct download, we'd need more logic, 
      // but expo-print usually handles it via window.print() or similar.
    } else {
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    }
  } catch (error) {
    console.error('PDF Export Error:', error);
    throw error;
  }
};
