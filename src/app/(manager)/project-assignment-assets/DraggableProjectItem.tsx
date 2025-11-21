import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Draggable, DraggableProvided } from '@hello-pangea/dnd';
import { Project } from '../ProjectsContext';
import { theme } from '../../../theme';
import { Ionicons } from '@expo/vector-icons';

type DraggableProjectItemProps = {
  item: Project;
  index: number;
  isSelected: boolean;
  onPress: (project: Project) => void;
};

function hexToRgba(hex: string, alpha: number) {
  if (!/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) return `rgba(0,0,0,${alpha})`;
  let c = hex.substring(1).split('');
  if (c.length === 3) c = [c[0], c[0], c[1], c[1], c[2], c[2]];
  const num = parseInt(c.join(''), 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const DraggableProjectItem: React.FC<DraggableProjectItemProps> = ({
  item,
  index,
  isSelected,
  onPress,
}) => {
  const itemContent = (
    <View style={[styles.container, { backgroundColor: hexToRgba(item.color, 0.1) }, isSelected && styles.selected]}>
      <View style={[styles.colorIndicator, { backgroundColor: item.color }]} />
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemSubtitle}>{item.address}</Text>
      </View>
      {isSelected && <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />}
    </View>
  );

  return (
    <Draggable draggableId={`project-${item.id}`} index={index} {...(Draggable as any).defaultProps} renderClone={(provided: any) => {
      // web drag clone
      return Platform.OS === 'web' ? (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={{
            ...provided.draggableProps.style, // keep original drag positioning
          }}
        >
          {itemContent}
        </div>
      ) : (
        <View
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={[styles.container, styles.dragging, provided.draggableProps.style]}
        >
          {itemContent}
        </View>
      );
    }}>
      {(provided: DraggableProvided) => {
        return Platform.OS === 'web' ? (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            onClick={() => onPress(item)}
            style={StyleSheet.flatten([provided.draggableProps.style])} // preserve style, no extra background
          >
            {itemContent}
          </div>
        ) : (
          <TouchableOpacity
            ref={provided.innerRef as any}
            onPress={() => onPress(item)}
            style={[styles.container, isSelected && styles.selected]}
            activeOpacity={0.7}
          >
            {itemContent}
          </TouchableOpacity>
        );
      }}
    </Draggable>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.borderColor,
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing(1.5),
    borderRadius: theme.radius.md,
  },
  selected: {
    backgroundColor: theme.colors.primaryMuted,
  },
  dragging: {
    opacity: 0.8,
    ...theme.shadow.soft,
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
  itemSubtitle: {
    fontSize: 12,
    color: theme.colors.bodyText,
  },
});

export default DraggableProjectItem;
