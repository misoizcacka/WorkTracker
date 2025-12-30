import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Draggable, DraggableProvided } from '@hello-pangea/dnd';
import { CommonLocation } from '~/types';
import { theme } from '~/theme';
import { Ionicons } from '@expo/vector-icons';

type DraggableLocationItemProps = {
  item: CommonLocation;
  index: number;
};

const DraggableLocationItem: React.FC<DraggableLocationItemProps> = ({
  item,
  index,
}) => {
  const itemContent = (
    <View style={styles.container}>
      <View style={[styles.colorIndicator, { backgroundColor: theme.colors.secondary }]} />
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
      </View>
    </View>
  );

  return (
    <Draggable draggableId={`location-${item.id}`} index={index}>
      {(provided: DraggableProvided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={{...provided.draggableProps.style, ...StyleSheet.flatten(styles.wrapper)}} // Use object spread instead of StyleSheet.flatten
        >
          {itemContent}
        </div>
      )}
    </Draggable>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    userSelect: 'none', // prevent text selection during drag on web
  },
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.borderColor,
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing(1.5),
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.cardBackground,
    marginBottom: theme.spacing(1),
  },
  colorIndicator: {
    width: 30,
    height: 30,
    borderRadius: theme.radius.sm,
    marginRight: theme.spacing(1.5),
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontWeight: '500',
    color: theme.colors.headingText,
  },
});

export default DraggableLocationItem;
