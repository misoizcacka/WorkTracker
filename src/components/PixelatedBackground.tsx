import React from "react";
import { View, Dimensions, StyleSheet } from "react-native";
import { Svg, Rect } from 'react-native-svg';

const palette = ['#000000', '#000033', '#000066', '#000080'];

export const PixelatedBackground = () => {
  const { width, height } = Dimensions.get("window");
  const squareSize = 20;
  const numCols = Math.ceil(width / squareSize);
  const numRows = Math.ceil(height / squareSize);

  const squares = [];
  for (let i = 0; i < numRows; i++) {
    for (let j = 0; j < numCols; j++) {
      const y = i * squareSize;
      let color = 'white';

      if (y < height * 0.1) { // Top 10% - fully pixelated
        color = palette[Math.floor(Math.random() * palette.length)];
      } else if (y < height * 0.13) { // 10% to 13% - 10% pixelated (90% white)
        color = Math.random() > 0.9 ? 'white' : palette[Math.floor(Math.random() * palette.length)];
      } else if (y < height * 0.16) { // 13% to 16% - 25% pixelated (75% white)
        color = Math.random() > 0.75 ? 'white' : palette[Math.floor(Math.random() * palette.length)];
      } else if (y < height * 0.19) { // 16% to 19% - 50% pixelated (50% white)
        color = Math.random() > 0.5 ? 'white' : palette[Math.floor(Math.random() * palette.length)];
      } else if (y < height * 0.22) { // 19% to 22% - 70% pixelated (30% white)
        color = Math.random() > 0.3 ? 'white' : palette[Math.floor(Math.random() * palette.length)];
      } else if (y < height * 0.25) { // 22% to 25% - 90% pixelated (10% white)
        color = Math.random() > 0.1 ? 'white' : palette[Math.floor(Math.random() * palette.length)];
      } else { // 25% to 100% - solid white
        color = 'white';
      }

      squares.push(
        <Rect
          key={`${i}-${j}`}
          x={j * squareSize}
          y={i * squareSize}
          width={squareSize}
          height={squareSize}
          fill={color}
          opacity={1}
        />
      );
    }
  }

  return (
    <View style={styles.gradientContainer}>
      <Svg height={height} width={width}>
        {squares}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  gradientContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: "100%",
  },
});
