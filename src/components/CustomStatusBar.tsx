import React from 'react';
import { View, Platform, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';

interface CustomStatusBarProps {
  backgroundColor: string;
  style?: 'light' | 'dark' | 'auto';
}

const CustomStatusBar: React.FC<CustomStatusBarProps> = ({ backgroundColor, style = 'auto' }) => {
  if (Platform.OS === 'ios') {
    return (
      <View style={{ height: Constants.statusBarHeight, backgroundColor }}>
        <SafeAreaView>
          <StatusBar translucent backgroundColor={backgroundColor} style={style} />
        </SafeAreaView>
      </View>
    );
  }
  // On Android, the default StatusBar component with backgroundColor works well.
  return <StatusBar style={style} backgroundColor={backgroundColor} />;
};

export default CustomStatusBar;
