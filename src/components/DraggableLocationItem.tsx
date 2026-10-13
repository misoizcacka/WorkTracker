import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Text } from './Themed';
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
      <View style={[styles.colorBar, { backgroundColor: theme.colors.secondary }]} />
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
    <Draggable draggableId={`common_location-${item.id}`} index={index}>
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
    userSelect: 'none' as any,
  },
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

export default DraggableLocationItem;
