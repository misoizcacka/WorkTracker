import * as XLSX from 'xlsx-js-style';
import { Paths, File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export const exportToExcel = async (data: any[], fileName: string) => {
  try {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    await exportWorkbookToExcel(wb, fileName);
  } catch (error) {
    console.error('Excel Export Error:', error);
    throw error;
  }
};

export const exportWorkbookToExcel = async (workbook: XLSX.WorkBook, fileName: string) => {
  try {
    if (Platform.OS === 'web') {
      XLSX.writeFile(workbook, `${fileName}.xlsx`, { cellStyles: true } as any);
    } else {
      const wbout = XLSX.write(workbook, {
        type: 'base64',
        bookType: 'xlsx',
        cellStyles: true,
      });
      
      const file = new File(Paths.cache, `${fileName}.xlsx`);
      file.write(wbout, {
        encoding: 'base64',
      });
      
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
    }
  } catch (error) {
    console.error('Excel Export Error:', error);
    throw error;
  }
};
