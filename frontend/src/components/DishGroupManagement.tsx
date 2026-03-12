// src/components/DishGroupManagement.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams
} from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import API from '../api';

interface DishGroup {
  id: number;
  name: string;
  itemCount: number;
  active: boolean;
  order?: number;
}

interface DishGroupManagementProps {
  dishGroups: DishGroup[];
  setDishGroups: (groups: DishGroup[]) => void;
  categories: string[];
  setCategories: (categories: string[]) => void;
  setActiveCategory: (category: string) => void;
  currentTheme: any;
  t: any;
  onGroupUpdate: () => void;
}

export const DishGroupManagement: React.FC<DishGroupManagementProps> = ({
  dishGroups,
  setDishGroups,
  categories,
  setCategories,
  setActiveCategory,
  currentTheme,
  t,
  onGroupUpdate,
}) => {
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [showEditGroup, setShowEditGroup] = useState(false);
  const [editingGroup, setEditingGroup] = useState<DishGroup | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
const [refreshKey, setRefreshKey] = useState(0);
  // Add Group
   const handleAddGroup = async (): Promise<void> => {
    if (!newGroupName.trim()) {
      Alert.alert(t.error, 'Please enter group name');
      return;
    }

    setLoading(true);
    try {
      const response = await API.post('/dishgroups', {
        name: newGroupName.trim(),
        active: formActive
      });

      const newGroup = {
        id: response.data.Id,
        name: response.data.Name,
        itemCount: 0,
        active: response.data.active ?? formActive,
      };

      // Add new group to the END of list
      const updatedGroups = [...dishGroups, newGroup];
      setDishGroups(updatedGroups);
      
      // Update categories (add to end)
      setCategories([...categories, newGroupName.trim()]);
      
      setNewGroupName('');
      setFormActive(true);
      setShowAddGroup(false);
      
      // Save order to backend after adding
      await saveOrderToBackend(updatedGroups);
      
      onGroupUpdate();
      
    } catch (error) {
      Alert.alert(t.error, 'Failed to add dish group');
    } finally {
      setLoading(false);
    }
  };

  // Edit Group
  const handleEditGroup = async (): Promise<void> => {
    if (!editingGroup || !newGroupName.trim()) return;

    setLoading(true);
    try {
      const response = await API.put(`/dishgroups/${editingGroup.id}`, {
        name: newGroupName.trim(),
        active: formActive
      });

      const oldName = editingGroup.name;
      
      // Update groups
      const updatedGroups = dishGroups.map(group =>
        group.id === editingGroup.id
          ? { ...group, name: newGroupName.trim(), active: formActive }
          : group
      );
      
      setDishGroups(updatedGroups);

      // Update categories (preserve order)
      const updatedCategories = categories.map(cat =>
        cat === oldName ? newGroupName.trim() : cat
      );
      setCategories(updatedCategories);

      if (oldName === categories[0]) {
        setActiveCategory(newGroupName.trim());
      }

      setEditingGroup(null);
      setNewGroupName('');
      setFormActive(true);
      setShowEditGroup(false);
      
      onGroupUpdate();
      
    } catch (error: any) {
      console.log('❌ Edit group error:', error);
      Alert.alert(t.error || '❌ Error', 'Failed to edit dish group');
    } finally {
      setLoading(false);
    }
  };

  // Toggle Active Status
  const toggleActive = async (group: DishGroup) => {
    setLoading(true);
    try {
      const newActiveState = !group.active;
      
      await API.put(`/dishgroups/${group.id}`, {
        name: group.name,
        active: newActiveState
      });

      const updatedGroups = dishGroups.map(g =>
        g.id === group.id ? { ...g, active: newActiveState } : g
      );
      setDishGroups(updatedGroups);

      onGroupUpdate();
      
    } catch (error) {
      Alert.alert(t.error, 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  // Delete Group
  const handleDeleteGroup = (group: DishGroup): void => {
    Alert.alert(
      t.delete,
      `${t.confirmDelete} "${group.name}"? ${t.thisWillDelete}`,
      [
        { text: t.no, style: 'cancel' },
        {
          text: t.yes,
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await API.delete(`/dishgroups/${group.id}`);

              const updatedGroups = dishGroups.filter(g => g.id !== group.id);
              const updatedCategories = categories.filter(cat => cat !== group.name);

              setDishGroups(updatedGroups);
              setCategories(updatedCategories);

              if (group.name === categories[0] && updatedCategories.length > 0) {
                setActiveCategory(updatedCategories[0]);
              }

              // Save new order after deletion
              await saveOrderToBackend(updatedGroups);
              
              onGroupUpdate();
              
            } catch (error) {
              Alert.alert(t.error, 'Failed to delete dish group');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // ✅ NEW: Save order to backend
  // In DishGroupManagement.tsx
const saveOrderToBackend = async (groups: DishGroup[]) => {
  try {
    const orderData = groups.map((group, index) => ({
      id: group.id,
      order: index
    }));
    
    console.log('📤 Sending order to backend:', orderData);
    
    // Send to backend
    const response = await API.post('/dishgroups/update-order', { groups: orderData });
    console.log('✅ Backend response:', response.data);
    
  } catch (error) {
    console.log('❌ Failed to save order to backend:', error);
    Alert.alert('Error', 'Failed to save group order');
  }
};

  // ✅ NEW: Handle drag end
  const handleDragEnd = async ({ data }: { data: DishGroup[] }) => {
    console.log('🔄 New order after drag:', data.map(g => g.name));
    
    // Update local state
    setDishGroups(data);
    
    // Update categories order
      setRefreshKey(prev => prev + 1);
    
    // Save to backend
    await saveOrderToBackend(data);
    
    setIsDragging(false);
    onGroupUpdate();
  };

  const openEditForm = (group: DishGroup) => {
    setEditingGroup(group);
    setNewGroupName(group.name);
    setFormActive(group.active);
    setShowEditGroup(true);
  };

  // Render each draggable item
  const renderItem = ({ item, drag, isActive }: RenderItemParams<DishGroup>) => {
    return (
      <ScaleDecorator>
        <View
          style={[
            styles.groupCard,
            {
              backgroundColor: currentTheme.card,
              borderColor: currentTheme.border,
              opacity: item.active ? 1 : 0.6,
              transform: [{ scale: isActive ? 1.02 : 1 }],
              shadowColor: isActive ? '#000' : 'transparent',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: isActive ? 5 : 0,
            }
          ]}
        >
          {/* Left side - Drag handle and info */}
          <View style={styles.groupInfo}>
            {/* Drag Handle - Long press to drag */}
            <TouchableOpacity
              onLongPress={drag}
              disabled={loading}
              style={styles.dragHandle}
            >
              <Ionicons 
                name="menu" 
                size={24} 
                color={isActive ? currentTheme.primary : currentTheme.textSecondary} 
              />
            </TouchableOpacity>
            
            <View style={styles.groupNameContainer}>
              <Text style={[styles.groupName, { color: currentTheme.text }]}>{item.name}</Text>
              <Text style={[styles.groupCount, { color: currentTheme.textSecondary }]}>
                {item.itemCount || 0} {t.items_lower}
              </Text>
            </View>
          </View>

          {/* Right side - Action buttons */}
          <View style={styles.groupActions}>
            {/* Active Toggle Button */}
            <TouchableOpacity
              style={[styles.actionBtn, { 
                backgroundColor: item.active ? currentTheme.success : currentTheme.inactive 
              }]}
              onPress={() => toggleActive(item)}
              disabled={loading}
            >
              <Ionicons 
                name={item.active ? "eye" : "eye-off"} 
                size={18} 
                color="#fff" 
              />
            </TouchableOpacity>

            {/* Edit Button */}
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: currentTheme.primary }]}
              onPress={() => openEditForm(item)}
              disabled={loading}
            >
              <Ionicons name="pencil" size={18} color="#fff" />
            </TouchableOpacity>

            {/* Delete Button */}
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: currentTheme.danger }]}
              onPress={() => handleDeleteGroup(item)}
              disabled={loading}
            >
              <Ionicons name="trash" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </ScaleDecorator>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: currentTheme.background }]}>
        <Text style={[styles.title, { color: currentTheme.text }]}>{t.dishGroupManagement}</Text>

        {/* Drag Instruction */}
        <Text style={[styles.dragHint, { color: currentTheme.textSecondary }]}>
          👆 Long press on ☰ and drag to reorder groups
        </Text>

        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: currentTheme.secondary }]}
          onPress={() => {
            setFormActive(true);
            setShowAddGroup(true);
          }}
          disabled={loading}
        >
          <Text style={styles.addButtonText}>{t.addNewGroup}</Text>
        </TouchableOpacity>

        {loading && <ActivityIndicator size="large" color={currentTheme.primary} />}

        {/* Draggable List */}
        <DraggableFlatList
          data={dishGroups}
          onDragEnd={handleDragEnd}
          keyExtractor={(item) => `group-${item.id}`}
          renderItem={renderItem}
          contentContainerStyle={styles.groupList}
          showsVerticalScrollIndicator={false}
          dragHitSlop={{ top: 10, bottom: 10, left: 50, right: 50 }}
          activationDistance={5}
          onDragBegin={() => setIsDragging(true)}
        />

        {/* Add Group Modal */}
        <Modal visible={showAddGroup} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: currentTheme.card }]}>
              <Text style={[styles.modalTitle, { color: currentTheme.text }]}>{t.addNewGroup}</Text>
              
              <TextInput
                style={[styles.modalInput, { 
                  backgroundColor: currentTheme.surface, 
                  borderColor: currentTheme.border, 
                  color: currentTheme.text 
                }]}
                placeholder={t.groupName}
                placeholderTextColor={currentTheme.textSecondary}
                value={newGroupName}
                onChangeText={setNewGroupName}
                editable={!loading}
              />

              <View style={styles.activeRow}>
                <Text style={[styles.activeLabel, { color: currentTheme.text }]}>Active</Text>
                <Switch
                  value={formActive}
                  onValueChange={setFormActive}
                  trackColor={{ false: currentTheme.inactive, true: currentTheme.success }}
                  thumbColor="#fff"
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.cancelBtn, { backgroundColor: currentTheme.surface }]}
                  onPress={() => {
                    setShowAddGroup(false);
                    setNewGroupName('');
                    setFormActive(true);
                  }}
                  disabled={loading}
                >
                  <Text style={[styles.cancelBtnText, { color: currentTheme.text }]}>{t.cancel}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.saveBtn, { backgroundColor: currentTheme.primary }]}
                  onPress={handleAddGroup}
                  disabled={loading}
                >
                  {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>{t.save}</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Edit Group Modal */}
        <Modal visible={showEditGroup} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: currentTheme.card }]}>
              <Text style={[styles.modalTitle, { color: currentTheme.text }]}>{t.edit}</Text>
              
              <TextInput
                style={[styles.modalInput, { 
                  backgroundColor: currentTheme.surface, 
                  borderColor: currentTheme.border, 
                  color: currentTheme.text 
                }]}
                placeholder={t.groupName}
                placeholderTextColor={currentTheme.textSecondary}
                value={newGroupName}
                onChangeText={setNewGroupName}
                editable={!loading}
              />

              <View style={styles.activeRow}>
                <Text style={[styles.activeLabel, { color: currentTheme.text }]}>Active</Text>
                <Switch
                  value={formActive}
                  onValueChange={setFormActive}
                  trackColor={{ false: currentTheme.inactive, true: currentTheme.success }}
                  thumbColor="#fff"
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.cancelBtn, { backgroundColor: currentTheme.surface }]}
                  onPress={() => {
                    setShowEditGroup(false);
                    setEditingGroup(null);
                    setNewGroupName('');
                    setFormActive(true);
                  }}
                  disabled={loading}
                >
                  <Text style={[styles.cancelBtnText, { color: currentTheme.text }]}>{t.cancel}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.saveBtn, { backgroundColor: currentTheme.primary }]}
                  onPress={handleEditGroup}
                  disabled={loading}
                >
                  {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>{t.update}</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </GestureHandlerRootView>
  );
};

// Updated styles
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8, includeFontPadding: false },
  dragHint: { 
    fontSize: 12, 
    marginBottom: 12, 
    fontStyle: 'italic',
    includeFontPadding: false 
  },
  addButton: { 
    padding: 14, 
    borderRadius: 10, 
    alignItems: 'center', 
    marginBottom: 16, 
    minHeight: 50, 
    justifyContent: 'center' 
  },
  addButtonText: { 
    color: '#ffffff', 
    fontSize: 15, 
    fontWeight: '600', 
    includeFontPadding: false 
  },
  groupList: { 
    paddingBottom: 20 
  },
  groupCard: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 12, 
    borderRadius: 10, 
    marginBottom: 8, 
    borderWidth: 1,
    minHeight: 70,
  },
  groupInfo: { 
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dragHandle: {
    padding: 8,
    marginRight: 8,
  },
  groupNameContainer: {
    flex: 1,
  },
  groupName: { 
    fontSize: 15, 
    fontWeight: '600', 
    marginBottom: 2,
    includeFontPadding: false 
  },
  groupCount: { 
    fontSize: 12,
    includeFontPadding: false 
  },
  groupActions: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6,
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', 
    padding: 16 
  },
  modalContent: { 
    borderRadius: 16, 
    padding: 20 
  },
  modalTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    marginBottom: 16, 
    textAlign: 'center', 
    includeFontPadding: false 
  },
  modalInput: { 
    borderWidth: 1, 
    borderRadius: 8, 
    padding: 12, 
    fontSize: 14, 
    marginBottom: 16, 
    minHeight: 50 
  },
  activeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  activeLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalButtons: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginTop: 8 
  },
  modalBtn: { 
    flex: 1, 
    paddingVertical: 12, 
    borderRadius: 8, 
    alignItems: 'center', 
    marginHorizontal: 4, 
    minHeight: 48, 
    justifyContent: 'center' 
  },
  cancelBtn: { 
    borderWidth: 1 
  },
  cancelBtnText: { 
    fontSize: 14, 
    fontWeight: '600', 
    includeFontPadding: false 
  },
  saveBtn: { 
    backgroundColor: '#4CAF50' 
  },
  saveBtnText: { 
    color: '#ffffff', 
    fontSize: 14, 
    fontWeight: '600', 
    includeFontPadding: false 
  },
});