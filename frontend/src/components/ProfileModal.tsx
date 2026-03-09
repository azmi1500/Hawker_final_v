// src/components/ProfileModal.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Platform } from 'react-native';

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
  isMobile: boolean;
  currentTheme: any;
  t: any;
  profileMode: string;
  profileTab: string;
  setProfileTab: (tab: string) => void;
  theme: string;
  language: string;
  handleThemeChange: (theme: string) => void;
  handleLanguageChange: (lang: string) => void;
  handleLogout: () => void;
  user: { id: number | string; username: string; role: string } | null;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  visible,
  onClose,
  isMobile,
  currentTheme,
  t,
  profileMode,
  profileTab,
  setProfileTab,
  theme: currentThemeName,
  language: currentLanguage,
  handleThemeChange,
  handleLanguageChange,
  handleLogout,
  user,
}) => {
  // 🎯 Temporary state for selections
  const [selectedTheme, setSelectedTheme] = useState(currentThemeName);
  const [selectedLanguage, setSelectedLanguage] = useState(currentLanguage);

  // Reset when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedTheme(currentThemeName);
      setSelectedLanguage(currentLanguage);
    }
  }, [visible, currentThemeName, currentLanguage]);

  // ✅ Handle OK - Apply changes
  const handleOk = () => {
    if (profileTab === 'theme' && selectedTheme !== currentThemeName) {
      handleThemeChange(selectedTheme);
    } else if (profileTab === 'language' && selectedLanguage !== currentLanguage) {
      handleLanguageChange(selectedLanguage);
    }
    onClose();
  };

  // ❌ Handle Cancel - Discard changes
  const handleCancel = () => {
    setSelectedTheme(currentThemeName);
    setSelectedLanguage(currentLanguage);
    onClose();
  };

  // Logout mode - different UI
  if (profileMode === 'logout') {
    return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.modalOverlay}>
          <View style={[styles.profileModal, isMobile && styles.profileModalMobile, { backgroundColor: currentTheme.card }]}>
            <View style={[styles.profileModalHeader, { backgroundColor: currentTheme.primary }]}>
              <Text style={styles.profileModalTitle}>{t.profile}</Text>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.profileContent}>
              <View style={styles.userInfoContainer}>
                <View style={[styles.userAvatar, { backgroundColor: currentTheme.primary }]}>
                  <Text style={styles.userAvatarText}>👤</Text>
                </View>
                <Text style={[styles.userName, { color: currentTheme.text }]}>
                  {user?.username || 'User'}
                </Text>
                <Text style={[styles.userRole, { color: currentTheme.textSecondary }]}>
                  {user?.role || 'Staff'}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.logoutButton, { backgroundColor: currentTheme.danger }]}
                onPress={handleLogout}
              >
                <Text style={styles.logoutButtonText}>🚪Logout{t.logout}</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={[styles.profileCancelBtn, { backgroundColor: currentTheme.surface, borderColor: currentTheme.border }]}
              onPress={onClose}
            >
              <Text style={[styles.profileCancelText, { color: currentTheme.text }]}>{t.cancel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // 🎨 Theme & Language selection mode
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.profileModal, isMobile && styles.profileModalMobile, { backgroundColor: currentTheme.card }]}>
          
          {/* Header */}
          <View style={[styles.profileModalHeader, { backgroundColor: currentTheme.primary }]}>
            <Text style={styles.profileModalTitle}>{t.profile}</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          {/* Tabs */}
          <View style={[styles.profileTabs, { borderBottomColor: currentTheme.border }]}>
            <TouchableOpacity
              style={[
                styles.profileTab, 
                profileTab === 'theme' && styles.profileTabActive,
                profileTab === 'theme' && { borderBottomColor: currentTheme.primary }
              ]}
              onPress={() => setProfileTab('theme')}
            >
              <Text style={[
                styles.profileTabText, 
                { color: currentTheme.textSecondary },
                profileTab === 'theme' && { color: currentTheme.primary }
              ]}>
                🎨 {t.selectTheme}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.profileTab, 
                profileTab === 'language' && styles.profileTabActive,
                profileTab === 'language' && { borderBottomColor: currentTheme.primary }
              ]}
              onPress={() => setProfileTab('language')}
            >
              <Text style={[
                styles.profileTabText, 
                { color: currentTheme.textSecondary },
                profileTab === 'language' && { color: currentTheme.primary }
              ]}>
                🌐 {t.selectLanguage}
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Content */}
          <ScrollView style={styles.profileContent}>
            {profileTab === 'theme' ? (
              /* 🎨 Theme Options */
              <>
                <TouchableOpacity
                  style={[
                    styles.themeOption, 
                    { 
                      backgroundColor: selectedTheme === 'light' ? currentTheme.primary : currentTheme.surface, 
                      borderColor: currentTheme.border 
                    }
                  ]}
                  onPress={() => setSelectedTheme('light')}
                >
                  <View style={[styles.themeColorPreview, { backgroundColor: '#ffffff', borderWidth: 1, borderColor: currentTheme.border }]} />
                  <Text style={[
                    styles.themeOptionText, 
                    { color: selectedTheme === 'light' ? '#ffffff' : currentTheme.text }
                  ]}>
                    {t.lightTheme}
                  </Text>
                  {selectedTheme === 'light' && <Text style={styles.themeCheck}>✓</Text>}
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.themeOption, 
                    { 
                      backgroundColor: selectedTheme === 'night' ? currentTheme.primary : currentTheme.surface, 
                      borderColor: currentTheme.border 
                    }
                  ]}
                  onPress={() => setSelectedTheme('night')}
                >
                  <View style={[styles.themeColorPreview, { backgroundColor: '#121212' }]} />
                  <Text style={[
                    styles.themeOptionText, 
                    { color: selectedTheme === 'night' ? '#ffffff' : currentTheme.text }
                  ]}>
                    {t.nightTheme}
                  </Text>
                  {selectedTheme === 'night' && <Text style={styles.themeCheck}>✓</Text>}
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.themeOption, 
                    { 
                      backgroundColor: selectedTheme === 'blue' ? currentTheme.primary : currentTheme.surface, 
                      borderColor: currentTheme.border 
                    }
                  ]}
                  onPress={() => setSelectedTheme('blue')}
                >
                  <View style={[styles.themeColorPreview, { backgroundColor: '#2196F3' }]} />
                  <Text style={[
                    styles.themeOptionText, 
                    { color: selectedTheme === 'blue' ? '#ffffff' : currentTheme.text }
                  ]}>
                    {t.blueTheme}
                  </Text>
                  {selectedTheme === 'blue' && <Text style={styles.themeCheck}>✓</Text>}
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.themeOption, 
                    { 
                      backgroundColor: selectedTheme === 'green' ? currentTheme.primary : currentTheme.surface, 
                      borderColor: currentTheme.border 
                    }
                  ]}
                  onPress={() => setSelectedTheme('green')}
                >
                  <View style={[styles.themeColorPreview, { backgroundColor: '#4CAF50' }]} />
                  <Text style={[
                    styles.themeOptionText, 
                    { color: selectedTheme === 'green' ? '#ffffff' : currentTheme.text }
                  ]}>
                    {t.greenTheme}
                  </Text>
                  {selectedTheme === 'green' && <Text style={styles.themeCheck}>✓</Text>}
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.themeOption, 
                    { 
                      backgroundColor: selectedTheme === 'purple' ? currentTheme.primary : currentTheme.surface, 
                      borderColor: currentTheme.border 
                    }
                  ]}
                  onPress={() => setSelectedTheme('purple')}
                >
                  <View style={[styles.themeColorPreview, { backgroundColor: '#9C27B0' }]} />
                  <Text style={[
                    styles.themeOptionText, 
                    { color: selectedTheme === 'purple' ? '#ffffff' : currentTheme.text }
                  ]}>
                    {t.purpleTheme}
                  </Text>
                  {selectedTheme === 'purple' && <Text style={styles.themeCheck}>✓</Text>}
                </TouchableOpacity>
              </>
            ) : (
              /* 🌐 Language Options */
              <>
                <TouchableOpacity
                  style={[
                    styles.languageOption, 
                    { 
                      backgroundColor: selectedLanguage === 'en' ? currentTheme.primary : currentTheme.surface, 
                      borderColor: currentTheme.border 
                    }
                  ]}
                  onPress={() => setSelectedLanguage('en')}
                >
                  <Text style={[
                    styles.languageOptionText, 
                    { color: selectedLanguage === 'en' ? '#ffffff' : currentTheme.text }
                  ]}>
                    🇬🇧 English
                  </Text>
                  {selectedLanguage === 'en' && <Text style={styles.languageCheck}>✓</Text>}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.languageOption, 
                    { 
                      backgroundColor: selectedLanguage === 'zh' ? currentTheme.primary : currentTheme.surface, 
                      borderColor: currentTheme.border 
                    }
                  ]}
                  onPress={() => setSelectedLanguage('zh')}
                >
                  <Text style={[
                    styles.languageOptionText, 
                    { color: selectedLanguage === 'zh' ? '#ffffff' : currentTheme.text }
                  ]}>
                    🇨🇳 中文
                  </Text>
                  {selectedLanguage === 'zh' && <Text style={styles.languageCheck}>✓</Text>}
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.languageOption, 
                    { 
                      backgroundColor: selectedLanguage === 'ms' ? currentTheme.primary : currentTheme.surface, 
                      borderColor: currentTheme.border 
                    }
                  ]}
                  onPress={() => setSelectedLanguage('ms')}
                >
                  <Text style={[
                    styles.languageOptionText, 
                    { color: selectedLanguage === 'ms' ? '#ffffff' : currentTheme.text }
                  ]}>
                    🇲🇾 Bahasa Melayu
                  </Text>
                  {selectedLanguage === 'ms' && <Text style={styles.languageCheck}>✓</Text>}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.languageOption, 
                    { 
                      backgroundColor: selectedLanguage === 'ta' ? currentTheme.primary : currentTheme.surface, 
                      borderColor: currentTheme.border 
                    }
                  ]}
                  onPress={() => setSelectedLanguage('ta')}
                >
                  <Text style={[
                    styles.languageOptionText, 
                    { color: selectedLanguage === 'ta' ? '#ffffff' : currentTheme.text }
                  ]}>
                    🇮🇳 தமிழ்
                  </Text>
                  {selectedLanguage === 'ta' && <Text style={styles.languageCheck}>✓</Text>}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.languageOption, 
                    { 
                      backgroundColor: selectedLanguage === 'hi' ? currentTheme.primary : currentTheme.surface, 
                      borderColor: currentTheme.border 
                    }
                  ]}
                  onPress={() => setSelectedLanguage('hi')}
                >
                  <Text style={[
                    styles.languageOptionText, 
                    { color: selectedLanguage === 'hi' ? '#ffffff' : currentTheme.text }
                  ]}>
                    🇮🇳 हिन्दी
                  </Text>
                  {selectedLanguage === 'hi' && <Text style={styles.languageCheck}>✓</Text>}
                </TouchableOpacity>
              </>
            )}
          </ScrollView>

          {/* ✅ OK and Cancel Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.cancelButton, { borderColor: currentTheme.border }]}
              onPress={handleCancel}
            >
              <Text style={[styles.actionButtonText, { color: currentTheme.text }]}>
                {t.cancel}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.okButton, { backgroundColor: currentTheme.success }]}
              onPress={handleOk}
            >
              <Text style={styles.actionButtonText}>OK </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ==================== COMPLETE STYLES ====================
const styles = StyleSheet.create({
  // Modal Overlay
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0, 0, 0, 0.5)', 
    justifyContent: 'flex-start',
    paddingTop: Platform.OS === 'ios' ? 50 : 0,
  },
  
  // Profile Modal Container
  profileModal: { 
    width: '90%', 
    maxWidth: 400, 
    borderRadius: 20, 
    alignSelf: 'center',
    maxHeight: '80%',
  },
  profileModalMobile: { 
    width: '95%',
  },
  
  // Header
  profileModalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 16, 
    borderTopLeftRadius: 20, 
    borderTopRightRadius: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    minHeight: Platform.OS === 'ios' ? 90 : 70,
  },
  profileModalTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: '#ffffff',
    includeFontPadding: false,
  },
  
  // Close Button
  closeButton: { 
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: { 
    fontSize: 20, 
    color: '#ffffff', 
    fontWeight: '600',
  },
  
  // Tabs
  profileTabs: { 
    flexDirection: 'row', 
    borderBottomWidth: 1,
  },
  profileTab: { 
    flex: 1, 
    paddingVertical: 14, 
    alignItems: 'center',
  },
  profileTabActive: { 
    borderBottomWidth: 2,
  },
  profileTabText: { 
    fontSize: 15,
    includeFontPadding: false,
  },
  
  // Content Container
  profileContent: { 
    maxHeight: 400, 
    padding: 16,
  },
  
  // Theme Options
  themeOption: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 14, 
    borderRadius: 10, 
    marginBottom: 10, 
    borderWidth: 1,
    minHeight: 60,
  },
  themeColorPreview: { 
    width: 28, 
    height: 28, 
    borderRadius: 14, 
    marginRight: 14,
  },
  themeOptionText: { 
    flex: 1, 
    fontSize: 16,
    includeFontPadding: false,
  },
  themeCheck: { 
    fontSize: 20, 
    color: '#ffffff', 
    fontWeight: '600',
  },
  
  // Language Options
  languageOption: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 10, 
    borderWidth: 1,
    minHeight: 60,
  },
  languageOptionText: { 
    fontSize: 16,
    includeFontPadding: false,
  },
  languageCheck: { 
    fontSize: 20, 
    color: '#ffffff', 
    fontWeight: '600',
  },
  
  // Cancel Button (at bottom)
  profileCancelBtn: { 
    margin: 16, 
    marginTop: 0, 
    padding: 14, 
    borderRadius: 10, 
    borderWidth: 1, 
    alignItems: 'center',
    minHeight: 50,
    justifyContent: 'center',
  },
  profileCancelText: { 
    fontSize: 16, 
    fontWeight: '600',
    includeFontPadding: false,
  },
  
  // User Info (for logout mode)
  userInfoContainer: { 
    alignItems: 'center', 
    paddingVertical: 20 
  },
  userAvatar: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 12 
  },
  userAvatarText: { 
    fontSize: 40 
  },
  userName: { 
    fontSize: 20, 
    fontWeight: '600', 
    marginBottom: 4, 
    includeFontPadding: false 
  },
  userRole: { 
    fontSize: 14, 
    marginBottom: 20, 
    includeFontPadding: false 
  },
  
  // Logout Button
  logoutButton: { 
    padding: 16, 
    borderRadius: 10, 
    alignItems: 'center', 
    minHeight: 50, 
    justifyContent: 'center', 
    marginHorizontal: 16, 
    marginBottom: 10 
  },
  logoutButtonText: { 
    color: '#ffffff', 
    fontSize: 16, 
    fontWeight: '600', 
    includeFontPadding: false 
  },
  
  // NEW STYLES FOR OK/CANCEL BUTTONS
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  cancelButton: {
    borderWidth: 1,
  },
  okButton: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    includeFontPadding: false,
    color: '#ffffff',
  },
});