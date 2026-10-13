import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Text } from './Themed';
import { Draggable, DraggableProvided } from '@hello-pangea/dnd';
import { Project } from '../context/ProjectsContext';
import { theme } from '~/theme';
import { Ionicons } from '@expo/vector-icons';

type DraggableProjectItemProps = {
  item: Project;
  index: number;
  isSelected: boolean;
  onPress: (project: Project) => void;
};

const DraggableProjectItem: React.FC<DraggableProjectItemProps> = ({
  item,
  index,
  isSelected,
  onPress,
}) => {
  const itemContent = (
    <View style={[styles.container, isSelected && styles.selected]}>
      <View style={[styles.colorBar, { backgroundColor: item.color || theme.colors.secondary }]} />
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} fontType="medium" numberOfLines={1}>{item.name}</Text>
        {item.address ? (
          <Text style={styles.itemSubtitle} fontType="regular" numberOfLines={1}>{item.address}</Text>
        ) : null}
      </View>
      <Ionicons
        name="menu-outline"
        size={16}
        color={theme.colors.disabledText}
        style={styles.dragHandle}
      />
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
            style={{...provided.draggableProps.style}} // Use object spread instead of StyleSheet.flatten
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    marginBottom: theme.spacing(1),
    overflow: 'hidden',
  },
  selected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryMuted,
  },
  dragging: {
    opacity: 0.9,
    ...theme.shadow.soft,
  },
  colorBar: {
    width: 4,
    alignSelf: 'stretch',
    borderTopLeftRadius: theme.radius.md,
    borderBottomLeftRadius: theme.radius.md,
  },
  itemInfo: {
    flex: 1,
    paddingVertical: theme.spacing(1.25),
    paddingHorizontal: theme.spacing(1.5),
  },
  itemName: {
    fontSize: 13,
    color: theme.colors.headingText,
  },
  itemSubtitle: {
    fontSize: 11,
    color: theme.colors.bodyText,
    marginTop: 2,
  },
  dragHandle: {
    paddingRight: theme.spacing(1.5),
  },
});

export default DraggableProjectItem;
