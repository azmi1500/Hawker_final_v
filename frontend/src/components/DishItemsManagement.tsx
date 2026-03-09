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
import { useCurrency } from '../context/CurrencyContext';  // ✅ Add this

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

interface DishItemsManagementProps {
  menuItems: MenuItem[];
  setMenuItems: (items: MenuItem[]) => void;
  categories: string[];
  dishGroups: any[];
  setDishGroups: (groups: any[]) => void;
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
  // ✅ Add currency hook
  const { formatPrice } = useCurrency();
  
  const [showAddDish, setShowAddDish] = useState(false);
  const [showEditDish, setShowEditDish] = useState(false);
  const [editingDish, setEditingDish] = useState<MenuItem | null>(null);
  
  // 🎯 IMPORTANT CHANGE: No default category!
  const [newDish, setNewDish] = useState<any>({
    name: '',
    price: '',
    category: '', // ❌ Empty initially - user must select
    imageUri: null,
    isActive: true,
  });
  
  const [loading, setLoading] = useState(false);
  const [categoryError, setCategoryError] = useState(false);

  // Helper functions
  const getCategoryIdByName = (categoryName: string): number => {
    console.log('🔍 Finding category ID for:', categoryName);
    
    if (!dishGroups || dishGroups.length === 0) {
      console.log('⚠️ No dish groups available');
      return 0;
    }
    
    const category = dishGroups.find(g => g.name === categoryName);
    return category?.id || 0;
  };

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setTimeout(() => {
          // You can add scroll logic here if needed
        }, 100);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
    };
  }, []);
  
  const getEnglishCategory = (categoryName: string): string => {
    if (categoryName === t.appetiser) return 'Appetiser';
    if (categoryName === t.mainCourse) return 'Main Course';
    if (categoryName === t.hotDrinks) return 'Hot Drinks';
    if (categoryName === t.desserts) return 'Desserts';
    return categoryName;
  };

  // ✅ VALIDATION FUNCTION
  const validateDishForm = (): boolean => {
    // Check dish name
    if (!newDish.name?.trim()) {
      Alert.alert(
        t.error || 'Error',
        t.pleaseEnterDishName || 'Please enter dish name'
      );
      return false;
    }

    // Check price
    const price = parseFloat(newDish.price);
    if (isNaN(price) || price <= 0) {
      Alert.alert(
        t.error || 'Error',
        t.pleaseEnterValidPrice || 'Please enter valid price'
      );
      return false;
    }

    // ✅ CHECK CATEGORY - User must select!
    if (!newDish.category || newDish.category.trim() === '') {
      setCategoryError(true);
      Alert.alert(
        t.error || 'Error',
        t.selectCategoryFirst || 'Please select a category first'
      );
      return false;
    }

    // Check if category exists in dishGroups
    const categoryId = getCategoryIdByName(newDish.category);
    if (!categoryId) {
      Alert.alert(
        t.error || 'Error',
        t.invalidCategory || 'Selected category is invalid'
      );
      return false;
    }

    return true;
  };

  // ✅ ADD DISH with proper validation
  const handleAddDish = async (): Promise<void> => {
  // First validate
  if (!validateDishForm()) {
    return; // Stop if validation fails
  }

  setLoading(true);
  setCategoryError(false);
  
  try {
    const formData = new FormData();
    formData.append('name', newDish.name.trim());
    formData.append('price', parseFloat(newDish.price).toString());
    formData.append('isActive', newDish.isActive ? 'true' : 'false');
    
    const selectedGroup = dishGroups.find(g => g.name === newDish.category);
    if (!selectedGroup) {
      Alert.alert('Error', 'Category not found');
      setLoading(false);
      return;
    }
    
    console.log('📦 Selected group:', selectedGroup);
    formData.append('category', selectedGroup.id.toString());

    const englishCategory = getEnglishCategory(newDish.category);
    formData.append('originalName', newDish.name.trim());
    formData.append('originalCategory', newDish.category);
    formData.append('displayCategory', newDish.category);

    if (newDish.imageUri) {
      const filename = newDish.imageUri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename || '');
      const type = match ? `image/${match[1]}` : 'image';

      formData.append('image', {
        uri: newDish.imageUri,
        name: filename || 'image.jpg',
        type,
      } as any);
      
      console.log('🖼️ Image attached:', filename);
    }

    console.log('📤 Sending to server...');
    console.log('🔗 URL:', `${uploadAPI.defaults.baseURL}/api/dishitems`);
    
    // ✅ Better logging - removed _parts
    console.log('📦 Sending dish:', {
      name: newDish.name,
      price: newDish.price,
      category: selectedGroup.name,
      categoryId: selectedGroup.id,
      hasImage: !!newDish.imageUri,
      isActive: newDish.isActive
    });

    const response = await uploadAPI.post('/dishitems', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    console.log('✅ Server response:', response.data);

    const baseURL = 'https://hawkerfinal-production.up.railway.app';
    const imageUrl = response.data.imageUri || response.data.ImageUrl
      ? `${baseURL}${response.data.imageUri || response.data.ImageUrl}`
      : null;

    const newItem = {
      id: response.data.Id || response.data.id,
      name: response.data.Name || response.data.name,
      price: parseFloat(response.data.Price || response.data.price || newDish.price),
      category: response.data.CategoryId?.toString() || selectedGroup.id.toString(),
      imageUri: imageUrl,
      originalName: response.data.OriginalName || newDish.name,
      originalCategory: response.data.OriginalCategory || englishCategory,
      displayCategory: response.data.DisplayCategory || newDish.category,
      isActive: response.data.isActive ?? newDish.isActive,
    };

    console.log('✅ New item created:', newItem);

    setMenuItems([...menuItems, newItem]);

    setDishGroups(dishGroups.map(group =>
      group.name === newDish.category
        ? { ...group, itemCount: (group.itemCount || 0) + 1 }
        : group
    ));

    // Reset form
    setNewDish({ 
      name: '', 
      price: '', 
      category: '',
      imageUri: null, 
      isActive: true 
    });
    
    setShowAddDish(false);

    Alert.alert('✅ Success', 'Item added successfully!');
    onItemUpdate();
    
  } catch (error: any) {
    console.log('❌ ERROR:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });

    Alert.alert(
      '❌ Error',
      error.response?.data?.error || t.failedToAddItem || 'Failed to add item'
    );
    
  } finally {
    setLoading(false);
  }
};

  // ✅ EDIT DISH with validation
  const handleEditDish = async (): Promise<void> => {
  if (!editingDish) return;
  
  if (!validateDishForm()) {
    return;
  }

  setLoading(true);
  
  try {
    console.log('✏️ Editing dish:', {
      id: editingDish.id,
      oldName: editingDish.name,
      newName: newDish.name,
      oldCategory: editingDish.category,
      newCategory: newDish.category
    });

    const formData = new FormData();
    formData.append('name', newDish.name.trim());
    formData.append('price', parseFloat(newDish.price).toString());
    formData.append('isActive', newDish.isActive ? 'true' : 'false');

    const categoryId = getCategoryIdByName(newDish.category);
    formData.append('category', categoryId.toString());

    const englishCategory = getEnglishCategory(newDish.category);
    formData.append('originalName', newDish.name.trim());
    formData.append('originalCategory', englishCategory);
    formData.append('displayCategory', newDish.category);

    if (newDish.imageUri && newDish.imageUri !== editingDish.imageUri) {
      const filename = newDish.imageUri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename || '');
      const type = match ? `image/${match[1]}` : 'image';

      formData.append('image', {
        uri: newDish.imageUri,
        name: filename || 'image.jpg',
        type,
      } as any);
      console.log('🖼️ New image attached');
    }

    console.log('📤 Sending update to server...');
    const response = await uploadAPI.put(`/dishitems/${editingDish.id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    console.log('✅ Update response:', response.data);

    const baseURL = 'https://hawkerfinal-production.up.railway.app';
    const imageUrl = response.data.imageUri || response.data.ImageUrl
      ? `${baseURL}${response.data.imageUri || response.data.ImageUrl}`
      : newDish.imageUri;

    const updatedItem = {
      ...editingDish,
      name: newDish.name.trim(),
      price: parseFloat(newDish.price),
      category: newDish.category,
      imageUri: imageUrl,
      originalName: newDish.name.trim(),
      originalCategory: englishCategory,
      displayCategory: newDish.category,
      isActive: newDish.isActive,
    };

    const updatedItems = menuItems.map(item =>
      item.id === editingDish.id ? updatedItem : item
    );
    setMenuItems(updatedItems);

    // Update category counts if changed
    if (editingDish.category !== newDish.category) {
      console.log('🔄 Category changed, updating counts');
      setDishGroups(dishGroups.map(group => {
        if (group.name === editingDish.category) {
          return { ...group, itemCount: Math.max(0, group.itemCount - 1) };
        }
        if (group.name === newDish.category) {
          return { ...group, itemCount: (group.itemCount || 0) + 1 };
        }
        return group;
      }));
    }

    setEditingDish(null);
    setNewDish({ 
      name: '', 
      price: '', 
      category: '',
      imageUri: null, 
      isActive: true 
    });
    setShowEditDish(false);

    console.log('✅ Item updated successfully');
    onItemUpdate();
    
  } catch (error: any) {
    console.log('❌ Edit error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    
    Alert.alert(
      t.error || '❌ Error',
      error.response?.data?.error || t.failedToUpdateItem || 'Failed to update item'
    );
  } finally {
    setLoading(false);
  }
};

  // ✅ TOGGLE ACTIVE - NO SUCCESS ALERT
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
    
    console.log('🔄 Toggling item:', {
      id: item.id,
      name: item.name,
      currentState: item.isActive,
      newState: newActiveState,
      category: categoryName,
      categoryId: category.id
    });
    
    const response = await API.put(`/dishitems/${item.id}`, {
      name: item.name,
      price: item.price,
      category: category.id,
      originalName: item.originalName || item.name,
      originalCategory: item.originalCategory || categoryName,
      displayCategory: item.displayCategory || categoryName,
      isActive: newActiveState
    });
    
    console.log('✅ Toggle response:', response.data);

    const updatedItems = menuItems.map(i => 
      i.id === item.id ? { ...i, isActive: newActiveState } : i
    );
    setMenuItems(updatedItems);

    // ✅ CHANGE THIS LINE - Pass a parameter to indicate toggle
    onItemUpdate();  // ← Add 'toggle' parameter
    
  } catch (error: any) {
    console.log('❌ Toggle error FULL:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    
    let errorMessage = 'Failed to update status';
    if (error.response?.data?.error) {
      errorMessage = error.response.data.error;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    Alert.alert('❌ Error', errorMessage);
    
  } finally {
    setLoading(false);
  }
};

  // ✅ DELETE DISH - Keep confirmation, remove success alert
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
            console.log('🗑️ Deleting dish:', {
              id: dish.id,
              name: dish.name,
              category: dish.category
            });

            // ✅ FIX: Add /api prefix
            await API.delete(`/dishitems/${dish.id}`);

            console.log('✅ Delete successful');

            const updatedItems = menuItems.filter(item => item.id !== dish.id);
            setMenuItems(updatedItems);

            setDishGroups(dishGroups.map(group =>
              group.name === dish.category
                ? { ...group, itemCount: Math.max(0, group.itemCount - 1) }
                : group
            ));

            onItemUpdate();
            
          } catch (error: any) {
            // ✅ Show DETAILED error
            console.log('❌ Delete error FULL:', {
              message: error.message,
              response: error.response?.data,
              status: error.response?.status,
              config: {
                url: error.config?.url,
                method: error.config?.method,
                baseURL: error.config?.baseURL
              }
            });
            
            // Show specific error message
            let errorMessage = 'Failed to delete dish item';
            if (error.response?.data?.error) {
              errorMessage = error.response.data.error;
            } else if (error.message) {
              errorMessage = error.message;
            }
            
            Alert.alert(t.error || '❌ Error', errorMessage);
            
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

      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: currentTheme.secondary }]}
        onPress={() => {
          // 🎯 Open with EMPTY category
          setNewDish({ 
            name: '', 
            price: '', 
            category: '', // ❌ Empty - user must select
            imageUri: null, 
            isActive: true 
          });
          setCategoryError(false);
          setShowAddDish(true);
        }}
        disabled={loading}
      >
        <Text style={styles.addButtonText}>{t.addNewItem}</Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator size="large" color={currentTheme.primary} />}

      <ScrollView style={styles.dishList} showsVerticalScrollIndicator={false}>
        {menuItems.sort((a, b) => a.name.localeCompare(b.name))
        .map((item, index) => (
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
              <Text 
                style={[styles.dishName, { color: currentTheme.text }]} 
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {item.name}
              </Text>
              <Text 
                style={[styles.dishCategory, { color: currentTheme.textSecondary }]} 
                numberOfLines={1}
              >
                {item.displayCategory || item.category}
              </Text>
            </View>
            
            {/* ✅ Use formatPrice here */}
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
                    category: item.displayCategory || item.category,
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
        ))}
      </ScrollView>

      {/* ADD DISH MODAL */}
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
                  <Text style={[styles.modalTitle, { color: currentTheme.text }]}>{t.addNewItem}</Text>

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
                        {imageUploading ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
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
                        {imageUploading ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
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
                    returnKeyType="next"
                    blurOnSubmit={false}
                  />

                  {/* ✅ Update price input label */}
                  <Text style={[styles.modalLabel, { color: currentTheme.text }]}>{t.price} *</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: currentTheme.surface, borderColor: currentTheme.border, color: currentTheme.text }]}
                    placeholder="0.00"
                    placeholderTextColor={currentTheme.textSecondary}
                    keyboardType="numeric"
                    value={newDish.price}
                    onChangeText={(text) => setNewDish({ ...newDish, price: text })}
                    editable={!loading}
                    returnKeyType="done"
                  />

                  {/* Category Selection */}
                  <Text style={[styles.modalLabel, { color: currentTheme.text }]}>
                    {t.selectCategory} <Text style={{ color: currentTheme.danger }}>*</Text>
                  </Text>
                  
                  <View style={[
                    styles.categorySelectorContainer,
                    categoryError && !newDish.category && { borderColor: currentTheme.danger, borderWidth: 1, borderRadius: 8 }
                  ]}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categorySelector}>
                      {categories.sort((a, b) => a.localeCompare(b)).map((cat, index) => (
                        <TouchableOpacity
                          key={`cat-${index}-${cat}`}
                          style={[
                            styles.categoryChip,
                            { 
                              backgroundColor: newDish.category === cat ? currentTheme.primary : currentTheme.surface, 
                              borderColor: newDish.category === cat ? currentTheme.primary : currentTheme.border 
                            }
                          ]}
                          onPress={() => {
                            setNewDish({ ...newDish, category: cat });
                            setCategoryError(false);
                          }}
                          disabled={loading}
                        >
                          <Text
                            style={[
                              styles.categoryChipText,
                              { color: newDish.category === cat ? '#ffffff' : currentTheme.text }
                            ]}
                          >
                            {cat}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                  
                  {categoryError && !newDish.category && (
                    <Text style={[styles.errorText, { color: currentTheme.danger }]}>
                      ⚠️ {t.selectCategoryRequired || 'Please select a category'}
                    </Text>
                  )}

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
                        setCategoryError(false);
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
                      {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>{t.save}</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* EDIT DISH MODAL */}
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
                      {imageUploading ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
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
                      {imageUploading ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
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
                  returnKeyType="next"
                  blurOnSubmit={false}
                />

                {/* ✅ Update price input label */}
                <Text style={[styles.modalLabel, { color: currentTheme.text }]}>{t.price} *</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: currentTheme.surface, borderColor: currentTheme.border, color: currentTheme.text }]}
                  placeholder="0.00"
                  placeholderTextColor={currentTheme.textSecondary}
                  keyboardType="numeric"
                  value={newDish.price}
                  onChangeText={(text) => setNewDish({ ...newDish, price: text })}
                  editable={!loading}
                  returnKeyType="done"
                />

                {/* Category Selection */}
                <Text style={[styles.modalLabel, { color: currentTheme.text }]}>
                  {t.selectCategory} <Text style={{ color: currentTheme.danger }}>*</Text>
                </Text>
                
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categorySelector}>
                  {categories.map((cat, index) => (
                    <TouchableOpacity
                      key={`cat-${index}-${cat}`}
                      style={[
                        styles.categoryChip,
                        { 
                          backgroundColor: newDish.category === cat ? currentTheme.primary : currentTheme.surface, 
                          borderColor: newDish.category === cat ? currentTheme.primary : currentTheme.border 
                        }
                      ]}
                      onPress={() => setNewDish({ ...newDish, category: cat })}
                      disabled={loading}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          { color: newDish.category === cat ? '#ffffff' : currentTheme.text }
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

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
                    {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>{t.update}</Text>}
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

// Add new styles
const styles = StyleSheet.create({
  categorySelectorContainer: {
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    marginBottom: 12,
    marginLeft: 4,
    includeFontPadding: false,
  },
  container: { flex: 1, padding: 16 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 16, includeFontPadding: false },
  addButton: { 
    padding: 14, 
    borderRadius: 10, 
    alignItems: 'center', 
    marginBottom: 16, 
    minHeight: 50, 
    justifyContent: 'center' 
  },
  keyboardView: {
    flex: 1,
    width: '100%',
  },
  addButtonText: { 
    color: '#ffffff', 
    fontSize: 15, 
    fontWeight: '600', 
    includeFontPadding: false 
  },
  dishList: { 
    flex: 1 
  },
  dishCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 12, 
    borderRadius: 10, 
    marginBottom: 8, 
    borderWidth: 1,
    minHeight: 80,
  },
  dishImageContainer: { 
    width: 50, 
    height: 50, 
    borderRadius: 8, 
    overflow: 'hidden', 
    marginRight: 12,
  },
  dishThumbnail: { 
    width: '100%', 
    height: '100%', 
    resizeMode: 'cover' 
  },
  dishThumbnailPlaceholder: { 
    width: '100%', 
    height: '100%', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  dishThumbnailText: { 
    fontSize: 22 
  },
  dishInfo: { 
    flex: 1,
    marginRight: 8,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  dishName: { 
    fontSize: 13, 
    fontWeight: '400', 
    marginBottom: 4,
    includeFontPadding: false,
    flexWrap: 'wrap',
  },
  dishCategory: { 
    fontSize: 13,
    includeFontPadding: false,
    color: '#666',
    flexWrap: 'wrap',
  },
  dishPrice: { 
    fontSize: 16, 
    fontWeight: '700', 
    marginRight: 12, 
    includeFontPadding: false 
  },
  dishActions: { 
    flexDirection: 'row',
    gap: 4,
    width: 86,
    justifyContent: 'flex-end',
    flexShrink: 0,
  },
  actionBtn: {
    width: 27,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  activeLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    padding: 16,
  },
  modalContent: {
    borderRadius: 16,
    padding: 20,
    width: '100%',
  },
  scrollModalContent: { 
    flexGrow: 1,
  },
  modalTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    marginBottom: 16, 
    textAlign: 'center', 
    includeFontPadding: false 
  },
  modalLabel: { 
    fontSize: 14, 
    fontWeight: '600', 
    marginBottom: 4, 
    marginTop: 8, 
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
  imageUploadContainer: { 
    marginBottom: 16 
  },
  imagePreviewContainer: { 
    width: '100%', 
    height: 150, 
    borderRadius: 8, 
    overflow: 'hidden', 
    marginBottom: 8, 
    position: 'relative', 
    borderWidth: 1 
  },
  imagePreview: { 
    width: '100%', 
    height: '100%', 
    resizeMode: 'cover' 
  },
  removeImageButton: { 
    position: 'absolute', 
    top: 8, 
    right: 8, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    width: 30, 
    height: 30, 
    borderRadius: 15, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  removeImageText: { 
    color: '#ffffff', 
    fontSize: 16, 
    fontWeight: '600' 
  },
  imagePlaceholder: { 
    width: '100%', 
    height: 150, 
    borderRadius: 8, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 8, 
    borderWidth: 1, 
    borderStyle: 'dashed' 
  },
  imagePlaceholderText: { 
    fontSize: 40 
  },
  imagePlaceholderSubText: { 
    fontSize: 12, 
    marginTop: 4, 
    includeFontPadding: false 
  },
  imageButtonsContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between' 
  },
  imageButton: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 10, 
    borderRadius: 8, 
    marginHorizontal: 4, 
    minHeight: 48 
  },
  imageButtonIcon: { 
    fontSize: 16, 
    color: '#ffffff', 
    marginRight: 4 
  },
  imageButtonText: { 
    color: '#ffffff', 
    fontSize: 12, 
    fontWeight: '600', 
    includeFontPadding: false 
  },
  galleryButton: { 
    backgroundColor: '#2196F3' 
  },
  cameraButton: { 
    backgroundColor: '#FF4444' 
  },
  categorySelector: { 
    flexDirection: 'row', 
    marginBottom: 16, 
    maxHeight: 50 
  },
  categoryChip: { 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 20, 
    marginRight: 8, 
    borderWidth: 1, 
    minHeight: 40, 
    justifyContent: 'center' 
  },
  categoryChipText: { 
    fontSize: 13, 
    includeFontPadding: false 
  },
  selectedCategoryChipText: { 
    color: '#ffffff' 
  },
});