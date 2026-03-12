// src/components/DishItemsManagement.tsx
import React, { useState, useEffect } from 'react';
import API from '../api';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  Switch,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { uploadAPI } from '../api';
import { useCurrency } from '../context/CurrencyContext';

interface MenuItem {
  id: number;
  name: string;
  price: number;
  imageUri: string | null;
  category: string;
  categoryId?: string; 
  categoryName?: string; 
  originalName?: string;
  originalCategory?: string;
  displayCategory?: string;
  isActive?: boolean;
}

interface DishGroup {
  id: number;
  name: string;
  itemCount: number;
  active: boolean;
  DisplayOrder?: number;
}

interface DishItemsManagementProps {
  menuItems: MenuItem[];
  setMenuItems: (items: MenuItem[]) => void;
  categories: string[];
  dishGroups: DishGroup[];
  setDishGroups: (groups: DishGroup[]) => void;
  currentTheme: any;
  t: any;
  onItemUpdate: () => void;
  imageUploading: boolean;
  setImageUploading: (loading: boolean) => void;
  pickImage: (setter: (uri: string) => void) => Promise<void>;
  captureImage: (setter: (uri: string) => void) => Promise<void>;
}

export const DishItemsManagement: React.FC<DishItemsManagementProps> = ({
  menuItems,
  setMenuItems,
  categories,
  dishGroups,
  setDishGroups,
  currentTheme,
  t,
  onItemUpdate,
  imageUploading,
  setImageUploading,
  pickImage,
  captureImage,
}) => {
  const { formatPrice } = useCurrency();
  
  // ============================================
  // STATE MANAGEMENT
  // ============================================
  const [selectedGroup, setSelectedGroup] = useState<DishGroup | null>(null);
  const [showAddDish, setShowAddDish] = useState(false);
  const [showEditDish, setShowEditDish] = useState(false);
  const [editingDish, setEditingDish] = useState<MenuItem | null>(null);
  
  const [newDish, setNewDish] = useState<any>({
    name: '',
    price: '',
    category: '',
    imageUri: null,
    isActive: true,
  });
  
  const [loading, setLoading] = useState(false);
  const [categoryError, setCategoryError] = useState(false);

  // ============================================
  // DERIVED DATA
  // ============================================
  
  // Sort groups by DisplayOrder (from drag & drop)
  const sortedGroups = React.useMemo(() => {
    return [...dishGroups]
      .filter(g => g.active !== false)
      .sort((a, b) => (a.DisplayOrder ?? 999) - (b.DisplayOrder ?? 999));
  }, [dishGroups]);

  // Get items for selected group ONLY
  const groupItems = React.useMemo(() => {
    if (!selectedGroup) return [];
    
    return menuItems
      .filter(item => 
        item.categoryId === selectedGroup.id.toString() || 
        item.displayCategory === selectedGroup.name ||
        item.category === selectedGroup.name
      )
      .sort((a, b) => a.name.localeCompare(b.name)); // Sort items alphabetically within group
  }, [menuItems, selectedGroup]);

  // ============================================
  // EFFECTS
  // ============================================
  
  // ✅ FIRST DISHGROUP SHOW AAGUM - Set first group as selected when groups load
  useEffect(() => {
    if (sortedGroups.length > 0 && !selectedGroup) {
      setSelectedGroup(sortedGroups[0]);
    }
  }, [sortedGroups]);

  // ✅ ADD FORM LA CATEGORY AUTO-SET - Update form category when selected group changes
  useEffect(() => {
    if (selectedGroup && showAddDish) {
      setNewDish(prev => ({
        ...prev,
        category: selectedGroup.name
      }));
    }
  }, [selectedGroup, showAddDish]);

  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  
  const getCategoryIdByName = (categoryName: string): number => {
    const category = dishGroups.find(g => g.name === categoryName);
    return category?.id || 0;
  };

  const getEnglishCategory = (categoryName: string): string => {
    if (categoryName === t.appetiser) return 'Appetiser';
    if (categoryName === t.mainCourse) return 'Main Course';
    if (categoryName === t.hotDrinks) return 'Hot Drinks';
    if (categoryName === t.desserts) return 'Desserts';
    return categoryName;
  };

  const validateDishForm = (): boolean => {
    if (!newDish.name?.trim()) {
      Alert.alert(t.error || 'Error', 'Please enter dish name');
      return false;
    }

    const price = parseFloat(newDish.price);
    if (isNaN(price) || price <= 0) {
      Alert.alert(t.error || 'Error', 'Please enter valid price');
      return false;
    }

    // ✅ CHECK CATEGORY - Should be automatically set from selectedGroup
    if (!selectedGroup) {
      Alert.alert(t.error || 'Error', 'Please select a group first');
      return false;
    }

    return true;
  };

  // ============================================
  // HANDLER FUNCTIONS
  // ============================================
  
  const handleOpenAdd = () => {
    if (!selectedGroup) {
      Alert.alert('Error', 'Please select a group first');
      return;
    }
    
    setNewDish({
      name: '',
      price: '',
      category: selectedGroup.name, // ✅ AUTO-SET from selected group
      imageUri: null,
      isActive: true
    });
    setCategoryError(false);
    setShowAddDish(true);
  };

   const handleAddDish = async (): Promise<void> => {
    if (!validateDishForm() || !selectedGroup) return;

    setLoading(true);
    setCategoryError(false);
    
    try {
      const formData = new FormData();
      formData.append('name', newDish.name.trim());
      formData.append('price', parseFloat(newDish.price).toString());
      formData.append('isActive', newDish.isActive ? 'true' : 'false');
      
      formData.append('category', selectedGroup.id.toString());
      formData.append('originalName', newDish.name.trim());
      formData.append('originalCategory', selectedGroup.name);
      formData.append('displayCategory', selectedGroup.name);

      if (newDish.imageUri) {
        const filename = newDish.imageUri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename || '');
        const type = match ? `image/${match[1]}` : 'image';

        formData.append('image', {
          uri: newDish.imageUri,
          name: filename || 'image.jpg',
          type,
        } as any);
      }

      const response = await uploadAPI.post('/dishitems', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      console.log('✅ Upload response:', response.data);

      // ✅ FIX: Dynamic baseURL based on environment
      const baseURL = __DEV__ 
        ? 'http://192.168.0.169:5000'  // Development
        : 'https://hawkerfinalv-production.up.railway.app'; // Production
      
      // Get image path from response
      const imagePath = response.data.imageUri || response.data.ImageUrl;
      
      // Construct full URL
      let imageUrl = null;
      if (imagePath) {
        if (imagePath.startsWith('http')) {
          imageUrl = imagePath;  // Already full URL
        } else if (imagePath.startsWith('/')) {
          imageUrl = `${baseURL}${imagePath}`;  // Add base URL
        } else {
          imageUrl = `${baseURL}/uploads/${imagePath}`;  // Just filename
        }
      }

      console.log('🖼️ Image URL:', {
        original: imagePath,
        constructed: imageUrl,
        environment: __DEV__ ? 'Development' : 'Production',
        baseURL
      });

      const newItem = {
        id: response.data.Id || response.data.id,
        name: response.data.Name || response.data.name,
        price: parseFloat(response.data.Price || response.data.price || newDish.price),
        category: selectedGroup.id.toString(),
        categoryId: selectedGroup.id.toString(),
        displayCategory: selectedGroup.name,
        imageUri: imageUrl,  // ✅ Store full URL
        originalName: newDish.name.trim(),
        originalCategory: selectedGroup.name,
        isActive: newDish.isActive,
      };

      console.log('✅ New item created:', {
        name: newItem.name,
        imageUri: newItem.imageUri
      });
  
      setMenuItems([...menuItems, newItem]);

      // Update group item count
      const updatedGroups = dishGroups.map(group =>
        group.id === selectedGroup.id
          ? { ...group, itemCount: (group.itemCount || 0) + 1 }
          : group
      );
      setDishGroups(updatedGroups);

      setShowAddDish(false);
      onItemUpdate();
      Alert.alert('✅ Success', 'Item added successfully!');
      
    } catch (error: any) {
      console.log('❌ Error:', {
        message: error.message,
        response: error.response?.data
      });
      Alert.alert('❌ Error', error.response?.data?.error || 'Failed to add item');
    } finally {
      setLoading(false);
    }
  };
 const handleEditDish = async (): Promise<void> => {
    if (!editingDish || !selectedGroup) return;
    
    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('name', newDish.name.trim());
      formData.append('price', parseFloat(newDish.price).toString());
      formData.append('isActive', newDish.isActive ? 'true' : 'false');
      formData.append('category', selectedGroup.id.toString());
      formData.append('originalName', newDish.name.trim());
      formData.append('originalCategory', selectedGroup.name);
      formData.append('displayCategory', selectedGroup.name);

      if (newDish.imageUri && newDish.imageUri !== editingDish.imageUri) {
        const filename = newDish.imageUri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename || '');
        const type = match ? `image/${match[1]}` : 'image';

        formData.append('image', {
          uri: newDish.imageUri,
          name: filename || 'image.jpg',
          type,
        } as any);
      }

      const response = await uploadAPI.put(`/dishitems/${editingDish.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      console.log('✅ Edit response:', response.data);

      // ✅ FIX: Dynamic baseURL based on environment
      const baseURL = __DEV__ 
        ? 'http://192.168.0.169:5000'  // Development
        : 'https://hawkerfinalv-production.up.railway.app'; // Production
      
      // Get image path from response
      const imagePath = response.data.imageUri || response.data.ImageUrl;
      
      // Construct full URL
      let imageUrl = newDish.imageUri; // Default to existing
      
      if (imagePath) {
        if (imagePath.startsWith('http')) {
          imageUrl = imagePath;  // Already full URL
        } else if (imagePath.startsWith('/')) {
          imageUrl = `${baseURL}${imagePath}`;  // Add base URL
        } else {
          imageUrl = `${baseURL}/uploads/${imagePath}`;  // Just filename
        }
      }

      console.log('🖼️ Edit image URL:', {
        original: imagePath,
        constructed: imageUrl,
        environment: __DEV__ ? 'Development' : 'Production',
        baseURL
      });

      const updatedItem = {
        ...editingDish,
        name: newDish.name.trim(),
        price: parseFloat(newDish.price),
        category: selectedGroup.id.toString(),
        categoryId: selectedGroup.id.toString(),
        displayCategory: selectedGroup.name,
        imageUri: imageUrl,  // ✅ Store full URL
        originalName: newDish.name.trim(),
        originalCategory: selectedGroup.name,
        isActive: newDish.isActive,
      };

      const updatedItems = menuItems.map(item =>
        item.id === editingDish.id ? updatedItem : item
      );
      setMenuItems(updatedItems);

      console.log('✅ Item updated:', {
        name: updatedItem.name,
        imageUri: updatedItem.imageUri
      });

      setShowEditDish(false);
      onItemUpdate();
      
    } catch (error: any) {
      console.log('❌ Edit error:', {
        message: error.message,
        response: error.response?.data
      });
      Alert.alert('❌ Error', error.response?.data?.error || 'Failed to update item');
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (item: MenuItem) => {
    setLoading(true);
    try {
      const newActiveState = !(item.isActive ?? true);
      
      const categoryName = item.displayCategory || item.category;
      const category = dishGroups.find(g => g.name === categoryName);
      
      if (!category) {
        Alert.alert('Error', 'Category not found');
        setLoading(false);
        return;
      }
      
      const response = await API.put(`/dishitems/${item.id}`, {
        name: item.name,
        price: item.price,
        category: category.id,
        originalName: item.originalName || item.name,
        originalCategory: item.originalCategory || categoryName,
        displayCategory: item.displayCategory || categoryName,
        isActive: newActiveState
      });

      const updatedItems = menuItems.map(i => 
        i.id === item.id ? { ...i, isActive: newActiveState } : i
      );
      setMenuItems(updatedItems);
      onItemUpdate();
      
    } catch (error) {
      Alert.alert('❌ Error', 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

   const handleDeleteDish = (dish: MenuItem): void => {
    Alert.alert(
      t.delete,
      `${t.confirmDelete} "${dish.name}"?`,
      [
        { text: t.no, style: 'cancel' },
        {
          text: t.yes,
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await API.delete(`/dishitems/${dish.id}`);

              const updatedItems = menuItems.filter(item => item.id !== dish.id);
              setMenuItems(updatedItems);

              const updatedGroups = dishGroups.map(group =>
                (group.name === dish.displayCategory || group.name === dish.category)
                  ? { ...group, itemCount: Math.max(0, group.itemCount - 1) }
                  : group
              );
              setDishGroups(updatedGroups);

              onItemUpdate();
              
            } catch (error) {
              Alert.alert(t.error || '❌ Error', 'Failed to delete dish item');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };
  return (
    <View style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <Text style={[styles.title, { color: currentTheme.text }]}>{t.dishItems}</Text>

      {/* ✅ GROUP CHIPS - Horizontal scroll of all dishgroups */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.groupsScroll}
        contentContainerStyle={styles.groupsContainer}
      >
        {sortedGroups.map((group) => (
          <TouchableOpacity
            key={`group-${group.id}`}
            style={[
              styles.groupChip,
              {
                backgroundColor: selectedGroup?.id === group.id 
                  ? currentTheme.primary 
                  : currentTheme.surface,
                borderColor: currentTheme.border
              }
            ]}
            onPress={() => setSelectedGroup(group)} // ✅ Click panna adha select pannum
          >
            <Text style={[
              styles.groupChipText,
              { 
                color: selectedGroup?.id === group.id 
                  ? '#ffffff' 
                  : currentTheme.text 
              }
            ]}>
              {group.name} ({group.itemCount || 0})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ✅ SELECTED GROUP INFO - Shows which group is active */}
      {selectedGroup && (
        <View style={[styles.groupInfo, { backgroundColor: currentTheme.surface }]}>
          <Text style={[styles.groupInfoTitle, { color: currentTheme.text }]}>
            {selectedGroup.name} - {groupItems.length} items
          </Text>
        </View>
      )}

      {/* Add Button */}
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: currentTheme.secondary }]}
        onPress={handleOpenAdd}
        disabled={loading || !selectedGroup}
      >
        <Text style={styles.addButtonText}>
          + {t.addNewItem || 'Add New Item'} {selectedGroup ? `to ${selectedGroup.name}` : ''}
        </Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator size="large" color={currentTheme.primary} />}

      {/* ✅ ITEMS LIST - Shows only items from selected group */}
      <ScrollView style={styles.dishList} showsVerticalScrollIndicator={false}>
        {groupItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: currentTheme.textSecondary }]}>
              No items in this group
            </Text>
          </View>
        ) : (
          groupItems.map((item, index) => (
            <View
              key={`dish-${item.id}-${index}`}
              style={[
                styles.dishCard,
                {
                  backgroundColor: currentTheme.card,
                  borderColor: currentTheme.border,
                  opacity: (item.isActive ?? true) ? 1 : 0.5
                }
              ]}
            >
              <View style={styles.dishImageContainer}>
                {item.imageUri ? (
                  <Image source={{ uri: item.imageUri }} style={styles.dishThumbnail} />
                ) : (
                  <View style={[styles.dishThumbnailPlaceholder, { backgroundColor: currentTheme.surface }]}>
                    <Text style={styles.dishThumbnailText}>🍽️</Text>
                  </View>
                )}
              </View>

              <View style={styles.dishInfo}>
                <Text style={[styles.dishName, { color: currentTheme.text }]} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={[styles.dishCategory, { color: currentTheme.textSecondary }]} numberOfLines={1}>
                  {item.displayCategory || item.category}
                </Text>
              </View>
              
              <Text style={[styles.dishPrice, { color: currentTheme.primary }]}>
                {formatPrice(item.price)}
              </Text>
              
              <View style={styles.dishActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, { 
                    backgroundColor: (item.isActive ?? true) ? currentTheme.success : currentTheme.inactive 
                  }]}
                  onPress={() => toggleActive(item)}
                  disabled={loading}
                >
                  <Ionicons 
                    name={(item.isActive ?? true) ? "eye" : "eye-off"} 
                    size={18} 
                    color="#fff" 
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: currentTheme.primary }]}
                  onPress={() => {
                    setEditingDish(item);
                    setNewDish({
                      name: item.originalName || item.name,
                      price: item.price.toString(),
                      category: selectedGroup?.name || item.displayCategory || item.category,
                      imageUri: item.imageUri,
                      isActive: item.isActive ?? true,
                    });
                    setCategoryError(false);
                    setShowEditDish(true);
                  }}
                  disabled={loading}
                >
                  <Ionicons name="pencil" size={18} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: currentTheme.danger }]}
                  onPress={() => handleDeleteDish(item)}
                  disabled={loading}
                >
                  <Ionicons name="trash" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* ✅ ADD DISH MODAL - Category is READONLY (automatically set) */}
      <Modal visible={showAddDish} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.keyboardView}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 50 : 0}
            >
              <ScrollView 
                contentContainerStyle={styles.scrollContainer}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={true}
              >
                <View style={[styles.modalContent, { backgroundColor: currentTheme.card }]}>
                  <Text style={[styles.modalTitle, { color: currentTheme.text }]}>
                    Add Item to {selectedGroup?.name}
                  </Text>

                  {/* ✅ READONLY CATEGORY FIELD */}
                  <View style={[styles.readonlyField, { backgroundColor: currentTheme.surface }]}>
                    <Text style={[styles.readonlyLabel, { color: currentTheme.textSecondary }]}>
                      Category:
                    </Text>
                    <Text style={[styles.readonlyValue, { color: currentTheme.primary }]}>
                      {selectedGroup?.name}
                    </Text>
                  </View>

                  {/* Image upload section */}
                  <Text style={[styles.modalLabel, { color: currentTheme.text }]}>{t.dishImage}</Text>
                  <View style={styles.imageUploadContainer}>
                    {newDish.imageUri ? (
                      <View style={styles.imagePreviewContainer}>
                        <Image source={{ uri: newDish.imageUri }} style={styles.imagePreview} />
                        <TouchableOpacity
                          style={styles.removeImageButton}
                          onPress={() => setNewDish({ ...newDish, imageUri: null })}
                        >
                          <Text style={styles.removeImageText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={[styles.imagePlaceholder, { backgroundColor: currentTheme.surface, borderColor: currentTheme.border }]}>
                        <Text style={styles.imagePlaceholderText}>📸</Text>
                        <Text style={[styles.imagePlaceholderSubText, { color: currentTheme.textSecondary }]}>{t.noImage}</Text>
                      </View>
                    )}

                    <View style={styles.imageButtonsContainer}>
                      <TouchableOpacity
                        style={[styles.imageButton, styles.galleryButton, { backgroundColor: currentTheme.secondary }]}
                        onPress={() => pickImage((uri) => setNewDish({ ...newDish, imageUri: uri }))}
                        disabled={imageUploading || loading}
                      >
                        {imageUploading ? <ActivityIndicator size="small" color="#fff" /> : (
                          <>
                            <Text style={styles.imageButtonIcon}>🖼️</Text>
                            <Text style={styles.imageButtonText}>{t.gallery}</Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.imageButton, styles.cameraButton, { backgroundColor: currentTheme.primary }]}
                        onPress={() => captureImage((uri) => setNewDish({ ...newDish, imageUri: uri }))}
                        disabled={imageUploading || loading}
                      >
                        {imageUploading ? <ActivityIndicator size="small" color="#fff" /> : (
                          <>
                            <Text style={styles.imageButtonIcon}>📷</Text>
                            <Text style={styles.imageButtonText}>{t.camera}</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={[styles.modalLabel, { color: currentTheme.text }]}>{t.dishName} *</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: currentTheme.surface, borderColor: currentTheme.border, color: currentTheme.text }]}
                    placeholder={t.dishName}
                    placeholderTextColor={currentTheme.textSecondary}
                    value={newDish.name}
                    onChangeText={(text) => setNewDish({ ...newDish, name: text })}
                    editable={!loading}
                  />

                  <Text style={[styles.modalLabel, { color: currentTheme.text }]}>{t.price} *</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: currentTheme.surface, borderColor: currentTheme.border, color: currentTheme.text }]}
                    placeholder="0.00"
                    placeholderTextColor={currentTheme.textSecondary}
                    keyboardType="numeric"
                    value={newDish.price}
                    onChangeText={(text) => setNewDish({ ...newDish, price: text })}
                    editable={!loading}
                  />

                  {/* Active Switch */}
                  <View style={styles.activeRow}>
                    <Text style={[styles.activeLabel, { color: currentTheme.text }]}>Active</Text>
                    <Switch
                      value={newDish.isActive}
                      onValueChange={(value) => setNewDish({ ...newDish, isActive: value })}
                      trackColor={{ false: currentTheme.inactive, true: currentTheme.success }}
                      thumbColor="#fff"
                    />
                  </View>

                  {/* Buttons */}
                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={[styles.modalBtn, styles.cancelBtn, { backgroundColor: currentTheme.surface }]}
                      onPress={() => {
                        setShowAddDish(false);
                        setNewDish({ 
                          name: '', 
                          price: '', 
                          category: '',
                          imageUri: null, 
                          isActive: true 
                        });
                      }}
                      disabled={loading}
                    >
                      <Text style={[styles.cancelBtnText, { color: currentTheme.text }]}>{t.cancel}</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.modalBtn, styles.saveBtn, { backgroundColor: currentTheme.primary }]}
                      onPress={handleAddDish}
                      disabled={loading}
                    >
                      {loading ? <ActivityIndicator size="small" color="#fff" /> : 
                        <Text style={styles.saveBtnText}>{t.save}</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* EDIT DISH MODAL - Similar changes */}
      <Modal visible={showEditDish} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <ScrollView 
              contentContainerStyle={styles.scrollContainer}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
            >
              <View style={[styles.modalContent, { backgroundColor: currentTheme.card }]}>
                <Text style={[styles.modalTitle, { color: currentTheme.text }]}>{t.edit}</Text>

                {/* ✅ READONLY CATEGORY FIELD */}
                <View style={[styles.readonlyField, { backgroundColor: currentTheme.surface }]}>
                  <Text style={[styles.readonlyLabel, { color: currentTheme.textSecondary }]}>
                    Category:
                  </Text>
                  <Text style={[styles.readonlyValue, { color: currentTheme.primary }]}>
                    {selectedGroup?.name}
                  </Text>
                </View>

                {/* Image upload section - same as add modal */}
                <Text style={[styles.modalLabel, { color: currentTheme.text }]}>{t.dishImage}</Text>
                <View style={styles.imageUploadContainer}>
                  {newDish.imageUri ? (
                    <View style={styles.imagePreviewContainer}>
                      <Image source={{ uri: newDish.imageUri }} style={styles.imagePreview} />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => setNewDish({ ...newDish, imageUri: null })}
                      >
                        <Text style={styles.removeImageText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={[styles.imagePlaceholder, { backgroundColor: currentTheme.surface, borderColor: currentTheme.border }]}>
                      <Text style={styles.imagePlaceholderText}>📸</Text>
                      <Text style={[styles.imagePlaceholderSubText, { color: currentTheme.textSecondary }]}>{t.noImage}</Text>
                    </View>
                  )}

                  <View style={styles.imageButtonsContainer}>
                    <TouchableOpacity
                      style={[styles.imageButton, styles.galleryButton, { backgroundColor: currentTheme.secondary }]}
                      onPress={() => pickImage((uri) => setNewDish({ ...newDish, imageUri: uri }))}
                      disabled={imageUploading || loading}
                    >
                      {imageUploading ? <ActivityIndicator size="small" color="#fff" /> : (
                        <>
                          <Text style={styles.imageButtonIcon}>🖼️</Text>
                          <Text style={styles.imageButtonText}>{t.gallery}</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.imageButton, styles.cameraButton, { backgroundColor: currentTheme.primary }]}
                      onPress={() => captureImage((uri) => setNewDish({ ...newDish, imageUri: uri }))}
                      disabled={imageUploading || loading}
                    >
                      {imageUploading ? <ActivityIndicator size="small" color="#fff" /> : (
                        <>
                          <Text style={styles.imageButtonIcon}>📷</Text>
                          <Text style={styles.imageButtonText}>{t.camera}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={[styles.modalLabel, { color: currentTheme.text }]}>{t.dishName} *</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: currentTheme.surface, borderColor: currentTheme.border, color: currentTheme.text }]}
                  placeholder={t.dishName}
                  placeholderTextColor={currentTheme.textSecondary}
                  value={newDish.name}
                  onChangeText={(text) => setNewDish({ ...newDish, name: text })}
                  editable={!loading}
                />

                <Text style={[styles.modalLabel, { color: currentTheme.text }]}>{t.price} *</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: currentTheme.surface, borderColor: currentTheme.border, color: currentTheme.text }]}
                  placeholder="0.00"
                  placeholderTextColor={currentTheme.textSecondary}
                  keyboardType="numeric"
                  value={newDish.price}
                  onChangeText={(text) => setNewDish({ ...newDish, price: text })}
                  editable={!loading}
                />

                {/* Active Switch */}
                <View style={styles.activeRow}>
                  <Text style={[styles.activeLabel, { color: currentTheme.text }]}>Active</Text>
                  <Switch
                    value={newDish.isActive}
                    onValueChange={(value) => setNewDish({ ...newDish, isActive: value })}
                    trackColor={{ false: currentTheme.inactive, true: currentTheme.success }}
                    thumbColor="#fff"
                  />
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.cancelBtn, { backgroundColor: currentTheme.surface }]}
                    onPress={() => {
                      setShowEditDish(false);
                      setEditingDish(null);
                      setNewDish({ 
                        name: '', 
                        price: '', 
                        category: '', 
                        imageUri: null, 
                        isActive: true 
                      });
                    }}
                    disabled={loading}
                  >
                    <Text style={[styles.cancelBtnText, { color: currentTheme.text }]}>{t.cancel}</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.saveBtn, { backgroundColor: currentTheme.primary }]}
                    onPress={handleEditDish}
                    disabled={loading}
                  >
                    {loading ? <ActivityIndicator size="small" color="#fff" /> : 
                      <Text style={styles.saveBtnText}>{t.update}</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  groupsScroll: { maxHeight: 60, marginBottom: 16 },
  groupsContainer: { paddingHorizontal: 4, gap: 8 },
  groupChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: 'center'
  },
  groupChipText: { fontSize: 14, fontWeight: '500' },
  groupInfo: { padding: 12, borderRadius: 8, marginBottom: 16 },
  groupInfoTitle: { fontSize: 16, fontWeight: '600' },
  addButton: { 
    padding: 14, 
    borderRadius: 10, 
    alignItems: 'center', 
    marginBottom: 16, 
    minHeight: 50, 
    justifyContent: 'center' 
  },
  addButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  dishList: { flex: 1 },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 14 },
  dishCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 12, 
    borderRadius: 10, 
    marginBottom: 8, 
    borderWidth: 1,
    minHeight: 80,
  },
  dishImageContainer: { width: 50, height: 50, borderRadius: 8, overflow: 'hidden', marginRight: 12 },
  dishThumbnail: { width: '100%', height: '100%', resizeMode: 'cover' },
  dishThumbnailPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  dishThumbnailText: { fontSize: 22 },
  dishInfo: { flex: 1, marginRight: 8 },
  dishName: { fontSize: 13, fontWeight: '400', marginBottom: 4 },
  dishCategory: { fontSize: 13, color: '#666' },
  dishPrice: { fontSize: 16, fontWeight: '700', marginRight: 12 },
  dishActions: { flexDirection: 'row', gap: 4, width: 86, justifyContent: 'flex-end' },
  actionBtn: { width: 27, height: 32, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', padding: 16 },
  modalContent: { borderRadius: 16, padding: 20, width: '100%' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  modalLabel: { fontSize: 14, fontWeight: '600', marginBottom: 4, marginTop: 8 },
  modalInput: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 14, marginBottom: 16, minHeight: 50 },
  readonlyField: { flexDirection: 'row', padding: 12, borderRadius: 8, marginBottom: 16, alignItems: 'center' },
  readonlyLabel: { fontSize: 14, marginRight: 8 },
  readonlyValue: { fontSize: 14, fontWeight: '600', flex: 1 },
  activeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  activeLabel: { fontSize: 16, fontWeight: '500' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginHorizontal: 4, minHeight: 48 },
  cancelBtn: { borderWidth: 1 },
  cancelBtnText: { fontSize: 14, fontWeight: '600' },
  saveBtn: { backgroundColor: '#4CAF50' },
  saveBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  imageUploadContainer: { marginBottom: 16 },
  imagePreviewContainer: { width: '100%', height: 150, borderRadius: 8, overflow: 'hidden', marginBottom: 8, borderWidth: 1 },
  imagePreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  removeImageButton: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  removeImageText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  imagePlaceholder: { width: '100%', height: 150, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 8, borderWidth: 1, borderStyle: 'dashed' },
  imagePlaceholderText: { fontSize: 40 },
  imagePlaceholderSubText: { fontSize: 12, marginTop: 4 },
  imageButtonsContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  imageButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, marginHorizontal: 4, minHeight: 48 },
  imageButtonIcon: { fontSize: 16, color: '#ffffff', marginRight: 4 },
  imageButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
  galleryButton: { backgroundColor: '#2196F3' },
  cameraButton: { backgroundColor: '#FF4444' },
  keyboardView: { flex: 1, width: '100%' },
  scrollContainer: { flexGrow: 1, paddingVertical: 20, paddingHorizontal: 16 },
});

export default DishItemsManagement;