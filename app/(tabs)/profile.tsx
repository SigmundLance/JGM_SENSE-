import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import { updateProfile } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { auth } from '../../firebaseConfig';
import { useProfilePhoto } from '../../hooks/use-profile-photo';
import { prepareProfilePhoto, saveProfilePhoto } from '../../utils/profilePhoto';

export default function ProfileScreen() {
  const router = useRouter();
  const { theme, isDarkModeEnabled } = useTheme();

  // Load SF Pro Fonts
  const [fontsLoaded] = useFonts({
    'SF-Pro-Regular': require('../../assets/images/fonts/SFPRODISPLAYREGULAR.otf'),
    'SF-Pro-Bold': require('../../assets/images/fonts/SFPRODISPLAYBOLD.otf'),
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState(auth.currentUser?.displayName || 'User');
  const [editName, setEditName] = useState(name);
  const [authPhotoURL, setAuthPhotoURL] = useState<string | null>(
    auth.currentUser?.photoURL || null
  );
  // Custom-uploaded photo, live from Firestore. Takes priority over
  // authPhotoURL, which otherwise reflects e.g. a Google account avatar.
  const firestorePhoto = useProfilePhoto(auth.currentUser?.uid);
  // Optimistic local preview only - never persisted anywhere. The
  // displayed photo only ever reflects firestorePhoto/authPhotoURL, so
  // a failed or in-progress save can never leave it pointing at a local
  // file that will vanish on reinstall/rebuild.
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const displayPhoto = previewUri ?? firestorePhoto ?? authPhotoURL;

  useEffect(() => {
    if (auth.currentUser) {
      if (auth.currentUser.displayName) {
        setName(auth.currentUser.displayName);
        setEditName(auth.currentUser.displayName);
      }
      if (auth.currentUser.photoURL) {
        setAuthPhotoURL(auth.currentUser.photoURL);
      }
    }
  }, []);

  const handlePickImage = async () => {
    // Request media library permissions
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(
        'Permission Required',
        'Permission to access the media library is needed to upload a profile picture.'
      );
      return;
    }

    // Launch gallery picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0].uri && auth.currentUser) {
      const selectedImageUri = result.assets[0].uri;
      // Show the picked photo immediately, but only as a preview - the
      // persisted photo (firestorePhoto) isn't touched until the save
      // actually succeeds.
      setPreviewUri(selectedImageUri);
      setIsSaving(true);

      try {
        const base64 = await prepareProfilePhoto(selectedImageUri);
        await saveProfilePhoto(auth.currentUser.uid, base64);
        // No local setState needed for the persisted photo itself -
        // firestorePhoto updates on its own via the live Firestore
        // listener once this write lands.
        Alert.alert('Success', 'Profile photo updated!');
      } catch (error: any) {
        Alert.alert('Photo Update Failed', error.message || 'Could not save your photo. Please try again.');
      } finally {
        setPreviewUri(null);
        setIsSaving(false);
      }
    }
  };

  const handleUpdateProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Invalid Name', 'Username cannot be empty.');
      return;
    }

    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: editName });
        setName(editName);
        setModalVisible(false);
        Alert.alert('Success', 'Your username has been updated!');
      }
    } catch (error: any) {
      Alert.alert('Update Failed', error.message);
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  const userEmail = auth.currentUser?.email || '2303640@ub.edu.ph';

  // Bright card background override
  const cardBackgroundColor = isDarkModeEnabled ? (theme.sectionBg || '#2A2A2A') : '#FFFFFF';

  return (
    <View style={[styles.container, { backgroundColor: theme.background || '#FFF6F6' }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle={isDarkModeEnabled ? 'light-content' : 'dark-content'} />

      {/* Top Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => router.replace('/Account')}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={28} color={theme.text || '#2D1F21'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text || '#2D1F21' }]}>
          My Profile
        </Text>
      </View>

      {/* Interactive Avatar with Photo Upload */}
      <View style={styles.avatarWrapper}>
        <TouchableOpacity
          style={styles.avatarContainer}
          activeOpacity={0.8}
          onPress={handlePickImage}
          disabled={isSaving}
        >
          {displayPhoto ? (
            <Image source={{ uri: displayPhoto }} style={styles.avatarImage} />
          ) : (
            <Ionicons name="person-outline" size={60} color="#F7A8B8" />
          )}

          {isSaving && (
            <View style={styles.uploadOverlay}>
              <ActivityIndicator color="#FFF" />
            </View>
          )}

          {/* Camera Badge Overlay */}
          <View style={styles.cameraBadge}>
            <Ionicons name="camera" size={14} color="#FFF" />
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* User Info Card */}
        <View style={[styles.card, { backgroundColor: cardBackgroundColor }]}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>USERNAME</Text>
            <Text style={[styles.infoValue, { color: theme.text || '#2D1F21' }]}>
              {name}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>EMAIL</Text>
            <Text style={[styles.infoValue, { color: theme.text || '#2D1F21' }]}>
              {userEmail}
            </Text>
          </View>
        </View>

        {/* Section Title */}
        <Text style={styles.sectionTitle}>ACCOUNT ACTIONS</Text>

        {/* Actions Group Card */}
        <View style={[styles.card, { backgroundColor: cardBackgroundColor }]}>
          {/* Change Username Action */}
          <TouchableOpacity
            style={styles.actionRow}
            activeOpacity={0.7}
            onPress={() => {
              setEditName(name);
              setModalVisible(true);
            }}
          >
            <View style={styles.actionLeft}>
              <Ionicons name="pencil-outline" size={20} color={theme.text || '#2D1F21'} />
              <Text style={[styles.actionText, { color: theme.text || '#2D1F21' }]}>
                Change Username
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#C4B4B7" />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Change Password Action */}
          <TouchableOpacity
            style={styles.actionRow}
            activeOpacity={0.7}
            onPress={() => router.push('/ChangePassword' as any)}
          >
            <View style={styles.actionLeft}>
              <Ionicons name="lock-closed-outline" size={20} color={theme.text || '#2D1F21'} />
              <Text style={[styles.actionText, { color: theme.text || '#2D1F21' }]}>
                Change Password
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#C4B4B7" />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Recovery Email Action */}
          <TouchableOpacity
            style={styles.actionRow}
            activeOpacity={0.7}
            onPress={() => router.replace('/recovery-email' as any)}
          >
            <View style={styles.actionLeft}>
              <Ionicons name="mail-outline" size={20} color={theme.text || '#2D1F21'} />
              <Text style={[styles.actionText, { color: theme.text || '#2D1F21' }]}>
                Recovery Email
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#C4B4B7" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Edit Username Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: cardBackgroundColor }]}>
            <Text style={[styles.modalTitle, { color: theme.text || '#2D1F21' }]}>
              Change Username
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                { color: theme.text || '#2D1F21', borderColor: '#E5D1D6' },
              ]}
              value={editName}
              onChangeText={setEditName}
              autoFocus
              placeholder="Enter new username"
              placeholderTextColor="#999"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleUpdateProfile}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 10,
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    fontFamily: 'SF-Pro-Bold',
    fontSize: 24,
  },
  avatarWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 25,
    marginBottom: 35,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFF0F2',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 2,
    borderColor: '#F7A8B8',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#C27581',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 50,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 20,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 25,
  },
  infoRow: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  infoLabel: {
    fontFamily: 'SF-Pro-Bold',
    fontSize: 10,
    color: '#A08C90',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  infoValue: {
    fontFamily: 'SF-Pro-Bold',
    fontSize: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#F7F0F1',
    marginHorizontal: 20,
  },
  sectionTitle: {
    fontFamily: 'SF-Pro-Bold',
    fontSize: 11,
    color: '#A08C90',
    letterSpacing: 0.8,
    marginLeft: 8,
    marginBottom: 10,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontFamily: 'SF-Pro-Bold',
    fontSize: 15,
    marginLeft: 14,
  },

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  modalTitle: {
    fontFamily: 'SF-Pro-Bold',
    fontSize: 18,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    fontFamily: 'SF-Pro-Regular',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F3EFEF',
    alignItems: 'center',
  },
  modalCancelText: {
    fontFamily: 'SF-Pro-Bold',
    fontSize: 15,
    color: '#666',
  },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#C27581',
    alignItems: 'center',
  },
  modalSaveText: {
    fontFamily: 'SF-Pro-Bold',
    fontSize: 15,
    color: '#FFF',
  },
});