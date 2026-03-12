// src/components/MenuGrid.tsx - FINAL WORKING VERSION with Image Queue

import React, { useMemo, useEffect, useState, useRef } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, 
  TouchableOpacity, Image, AppState, AppStateStatus 
} from 'react-native';
import { MenuItem } from '../types';

// Add this type for placeholder items
interface PlaceholderItem {
  id: string;
  isPlaceholder: boolean;
  name: string;
  price: number;
  category?: string;
  imageUri?: string | null;
  originalName?: string;
  originalCategory?: string;
}

interface MenuGridProps {
  currentItems: MenuItem[];
  addToCart: (item: MenuItem) => void;
  totalPages: number;
  currentPage: number;
  prevPage: () => void;
  nextPage: () => void;
  setCurrentPage: (page: number) => void;
  categoryItems: MenuItem[];
  allMenuItems: MenuItem[];
  menuUpdateTrigger: number;
  t: any;
  theme: any;
  formatPrice: (amount: number) => string;
     activeCategory: string;  // ✅ ADD THIS
  categories: string[];  
}

// Type guard to check if item is placeholder
const isPlaceholder = (item: MenuItem | PlaceholderItem): item is PlaceholderItem => {
  return (item as PlaceholderItem).isPlaceholder === true;
};

export const MenuGrid: React.FC<MenuGridProps> = ({ 
  currentItems, 
  addToCart, 
  totalPages, 
  currentPage, 
  prevPage, 
  nextPage, 
  setCurrentPage, 
  categoryItems, 
  allMenuItems,  
  menuUpdateTrigger, 
  t, 
  theme,
  formatPrice,
  categories,        // ✅ Now available
  activeCategory     
}) => {
  
  const itemsPerPage = 8;
  
  // State
  const [refreshKey, setRefreshKey] = useState(0);
  const [appState, setAppState] = useState(AppState.currentState);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const renderItemImage = (item: any) => {
  const [imageError, setImageError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  if (!item.imageUri) {
    return (
      <View style={[styles.menuItemImagePlaceholder, { backgroundColor: theme.surface }]}>
        <Text style={styles.menuItemImagePlaceholderText}>🍽️</Text>
      </View>
    );
  }

  // Add timestamp to bypass cache
  const imageUrl = item.imageUri.includes('?') 
    ? `${item.imageUri}&t=${Date.now()}`
    : `${item.imageUri}?t=${Date.now()}`;

  return (
    <Image 
      key={`img-${item.id}-${retryCount}`}
      source={{ uri: imageUrl }}
      style={styles.menuItemImage}
      resizeMode="cover"
      onLoad={() => {
        console.log(`✅ Loaded: ${item.name}`);
        setImageError(false);
      }}
      onError={(e) => {
        console.log(`❌ Failed: ${item.name}`, e.nativeEvent.error);
        setImageError(true);
        
        // Retry with HTTP after 2 seconds
        if (retryCount < 3) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, 2000);
        }
      }}
    />
  );
};
  // Refs for queue management
  const loadingQueue = useRef<string[]>([]);
  const isProcessing = useRef(false);
  const failedImages = useRef<Set<string>>(new Set());

  // Process image loading queue (only 2 at a time)
  const processImageQueue = async () => {
  if (isProcessing.current || loadingQueue.current.length === 0) return;
  
  isProcessing.current = true;
  
  // Load 2 images at a time
  const batch = loadingQueue.current.splice(0, 2);
  
  await Promise.all(
    batch.map(async (uri) => {
      try {
        // Skip if already loaded
        if (loadedImages.has(uri)) return;
        
        // Try HTTPS first
        await Image.prefetch(uri);
        setLoadedImages(prev => new Set(prev).add(uri));
        console.log(`✅ Image loaded: ${uri.substring(0, 30)}...`);
      } catch (error) {
        console.log(`❌ HTTPS failed: ${uri.substring(0, 30)}...`);
        
        // Try HTTP as fallback
        try {
          const httpUri = uri.replace('https://', 'http://');
          await Image.prefetch(httpUri);
          setLoadedImages(prev => new Set(prev).add(uri)); // Still store HTTPS URL
          console.log(`✅ HTTP fallback worked: ${uri.substring(0, 30)}...`);
        } catch (httpError) {
          console.log(`❌ Both failed: ${uri.substring(0, 30)}...`);
          // Don't add to failedImages permanently - will retry later
        }
      }
    })
  );
  
  isProcessing.current = false;
  
  // Process next batch if any
  if (loadingQueue.current.length > 0) {
    setTimeout(processImageQueue, 100);
  }
};

  // Listen to AppState changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      console.log('📱 AppState changed from', appState, 'to', nextAppState);
      
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        console.log('🔄 App came to foreground - refreshing images!');
        setLoadedImages(new Set()); // Clear loaded images
        failedImages.current.clear(); // Clear failed images
        setRefreshKey(prev => prev + 1);
      }
      
      setAppState(nextAppState);
    });

    return () => {
      subscription.remove();
    };
  }, [appState]);

  // Watch for menuUpdateTrigger
  useEffect(() => {
    console.log('🔄 MenuGrid refresh triggered!');
    setLoadedImages(new Set()); // Clear loaded images
    failedImages.current.clear(); // Clear failed images
    setRefreshKey(prev => prev + 1);
  }, [menuUpdateTrigger]);

  // Watch for page changes
  useEffect(() => {
    console.log(`📄 Page changed to ${currentPage} - refreshing images`);
    setLoadedImages(new Set()); // Clear loaded images for new page
    failedImages.current.clear(); // Clear failed images
    setRefreshKey(prev => prev + 1);
  }, [currentPage]);

  // Active items calculation
const activeItems = useMemo(() => {
  // ✅ Filter out inactive items!
  return categoryItems.filter(item => 
    item.isActive === true  // Only show active items
  );
}, [categoryItems]);
  // Calculate REAL total pages
 const realTotalPages = useMemo(() => {
  return Math.max(1, Math.ceil(activeItems.length / itemsPerPage));
}, [activeItems.length, itemsPerPage]);

  // Auto-fix current page
  useEffect(() => {
    if (currentPage > realTotalPages && realTotalPages > 0) {
      setCurrentPage(realTotalPages);
    }
  }, [activeItems.length, currentPage, realTotalPages]);

  // Sort alphabetically
const sortedItems = useMemo(() => {
  // Just return activeItems without sorting alphabetically
  // The order comes from your backend DisplayOrder
  return activeItems;
}, [activeItems]);

  // Get current page items
 const displayItems = useMemo(() => {
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  return activeItems.slice(startIndex, endIndex);
}, [activeItems, currentPage, itemsPerPage]);

useEffect(() => {
  console.log('🎯 MenuGrid received items:', activeItems.map(i => i.name));
}, [activeItems]);
useEffect(() => {
  console.log('📋 MenuGrid received items for', activeCategory, ':', 
    activeItems.map(i => i.name));
}, [activeItems]);
  // Queue images for loading
  useEffect(() => {
    // Add new images to queue
    displayItems.forEach(item => {
      if (item.imageUri && 
          !loadedImages.has(item.imageUri) && 
          !failedImages.current.has(item.imageUri)) {
        loadingQueue.current.push(item.imageUri);
      }
    });
    
    // Start processing queue
    processImageQueue();
    
  }, [displayItems, refreshKey]);

  // Create grid items with placeholders
  const gridItems = useMemo<(MenuItem | PlaceholderItem)[]>(() => {
    const items: (MenuItem | PlaceholderItem)[] = [...displayItems];
    const remainingSlots = itemsPerPage - items.length;
    
    for (let i = 0; i < remainingSlots; i++) {
      items.push({ 
        id: `placeholder-${currentPage}-${i}-${refreshKey}`,
        isPlaceholder: true,
        name: '',
        price: 0,
        category: '',
        imageUri: null,
        originalName: '',
        originalCategory: ''
      });
    }
    return items;
  }, [displayItems, currentPage, itemsPerPage, refreshKey]);

  if (activeItems.length === 0) {
    return (
      <View style={[styles.noItemsContainer, { backgroundColor: theme.background }]}>
        <Text style={[styles.noItemsText, { color: theme.textSecondary }]}>
          {t.noActiveItems || 'No active items in this category'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.menuGridContainer}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.menuGrid}>
          {gridItems.map((item) => {
            if (isPlaceholder(item)) {
              return (
                <View 
                  key={item.id}
                  style={[styles.menuItem, styles.placeholderItem]} 
                />
              );
            }
            
            return (
              <TouchableOpacity 
                key={`menu-${item.id}-${currentPage}-${refreshKey}`}
                style={[styles.menuItem, { 
                  backgroundColor: theme.card, 
                  borderColor: theme.border 
                }]} 
                onPress={() => addToCart(item)}
              >
                <View style={[styles.menuItemImageContainer, { backgroundColor: theme.surface }]}>
                 {item.imageUri && loadedImages.has(item.imageUri) ? (
  <Image 
    source={{ 
      uri: item.imageUri.replace('https://', 'http://')  // 👈 TRY HTTP
    }} 
    style={styles.menuItemImage}
    onLoad={() => console.log(`✅ Loaded: ${item.name}`)}
    onError={(e) => {
      console.log(`❌ HTTPS failed for ${item.name}, trying HTTPS again...`);
      // If HTTP fails, try HTTPS with timestamp
      const httpsUrl = item.imageUri + '?t=' + Date.now();
      // Force reload
      setTimeout(() => {
        setRefreshKey(prev => prev + 1);
      }, 1000);
    }}
  />
) : item.imageUri ? (
  <View style={[styles.menuItemImagePlaceholder, { backgroundColor: theme.surface }]}>
    <Text style={styles.menuItemImagePlaceholderText}>⏳</Text>
  </View>
) : (
  <View style={styles.menuItemImagePlaceholder}>
    <Text style={styles.menuItemImagePlaceholderText}>🍽️</Text>
  </View>
)}

                </View>
                <Text style={[styles.menuItemName, { color: theme.text }]} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={[styles.menuItemPrice, { color: theme.primary }]}>
                  {formatPrice(item.price)} 
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        
        {/* Pagination */}
        {realTotalPages > 1 && (
          <View style={[styles.paginationWrapper, { 
            backgroundColor: theme.surface, 
            borderTopColor: theme.border, 
            borderBottomColor: theme.border 
          }]}>
            <TouchableOpacity 
              style={[styles.paginationButton, { 
                backgroundColor: currentPage === 1 ? theme.surface : theme.primary 
              }]}
              onPress={() => {
                prevPage();
                if (currentPage > 1) setCurrentPage(currentPage - 1);
              }} 
              disabled={currentPage === 1}
            >
              <Text style={[styles.paginationButtonText, { 
                color: currentPage === 1 ? theme.textSecondary : '#ffffff' 
              }]}>←</Text>
            </TouchableOpacity>
            
            <View style={styles.pageNumbersContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {[...Array(realTotalPages)].map((_, index) => {
                  const pageNum = index + 1;
                  return (
                    <TouchableOpacity
                      key={pageNum}
                      style={[
                        styles.pageNumberButton, 
                        { 
                          backgroundColor: currentPage === pageNum ? theme.primary : theme.surface, 
                          borderColor: theme.border 
                        }
                      ]}
                      onPress={() => setCurrentPage(pageNum)}
                    >
                      <Text style={[
                        styles.pageNumberText, 
                        { color: currentPage === pageNum ? '#ffffff' : theme.textSecondary }
                      ]}>
                        {pageNum}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
            
            <TouchableOpacity 
              style={[styles.paginationButton, { 
                backgroundColor: currentPage === realTotalPages ? theme.surface : theme.primary 
              }]}
              onPress={() => {
                nextPage();
                if (currentPage < realTotalPages) setCurrentPage(currentPage + 1);
              }} 
              disabled={currentPage === realTotalPages}
            >
              <Text style={[styles.paginationButtonText, { 
                color: currentPage === realTotalPages ? theme.textSecondary : '#ffffff' 
              }]}>→</Text>
            </TouchableOpacity>
          </View>
        )}
        
        <Text style={[styles.itemCountText, { color: theme.textSecondary }]}>
          {t.showing} {displayItems.length} {t.of} {activeItems.length} {t.items_lower} • {t.page} {currentPage}/{realTotalPages}
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  menuGridContainer: { flex: 1 },
  menuGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    padding: 4 
  },
  menuItem: { 
    width: '50%', 
    padding: 8, 
    borderBottomWidth: 1, 
    borderRightWidth: 1, 
    alignItems: 'center', 
    minHeight: 150 
  },
  placeholderItem: {
    borderWidth: 0,
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
    borderRightWidth: 0,
  },
    loadingText: {
    fontSize: 10,
    marginTop: 4,
  },

  menuItemImageContainer: { 
    width: 80, 
    height: 80, 
    borderRadius: 12, 
    overflow: 'hidden', 
    marginBottom: 8 
  },
  menuItemImage: { 
    width: '100%', 
    height: '100%', 
    resizeMode: 'cover' 
  },
  menuItemImagePlaceholder: { 
    width: '100%', 
    height: '100%', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#f0f0f0' 
  },
  menuItemImagePlaceholderText: { 
    fontSize: 32 
  },
  menuItemName: { 
    fontSize: 13, 
    marginBottom: 4, 
    textAlign: 'center', 
    paddingHorizontal: 4, 
    includeFontPadding: false 
  },
  menuItemPrice: { 
    fontSize: 14, 
    fontWeight: '600', 
    includeFontPadding: false 
  },
  paginationWrapper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 12, 
    paddingVertical: 10, 
    borderTopWidth: 1, 
    borderBottomWidth: 1 
  },
  paginationButton: { 
    paddingHorizontal: 14, 
    paddingVertical: 8, 
    borderRadius: 20, 
    minWidth: 44, 
    alignItems: 'center', 
    minHeight: 44, 
    justifyContent: 'center' 
  },
  paginationButtonText: { 
    fontSize: 16, 
    fontWeight: '600', 
    includeFontPadding: false 
  },
  pageNumbersContainer: { 
    flex: 1, 
    marginHorizontal: 8, 
    height: 44 
  },
  pageNumberButton: { 
    width: 38, 
    height: 38, 
    borderRadius: 19, 
    marginHorizontal: 3, 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderWidth: 1 
  },
  pageNumberText: { 
    fontSize: 13, 
    fontWeight: '500', 
    includeFontPadding: false 
  },
  itemCountText: { 
    textAlign: 'center', 
    fontSize: 11, 
    paddingVertical: 8, 
    includeFontPadding: false 
  },
  noItemsContainer: {
    width: '100%',
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noItemsText: {
    fontSize: 16,
    textAlign: 'center',
  },
});