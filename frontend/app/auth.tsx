import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/context/AuthContext';

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async () => {
    setError(null);

    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }

    if (!isLogin && password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password, name.trim() || undefined);
      }
    } catch (e: any) {
      setError(e.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError(null);
    setPassword('');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kbContainer}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo & Branding */}
          <View style={styles.brandingContainer}>
            <Image
              source={require('../assets/images/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.firmName}>SHREE RAJ & CO</Text>
            <Text style={styles.tagline}>Register Management System</Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </Text>
            <Text style={styles.formSubtitle}>
              {isLogin
                ? 'Sign in to access your firm data'
                : 'Register to join your firm workspace'}
            </Text>

            {error && (
              <View style={styles.errorBox} testID="auth-error">
                <MaterialIcons name="error-outline" size={18} color="#ef4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {!isLogin && (
              <>
                <Text style={styles.inputLabel}>Your Name</Text>
                <View style={styles.inputWrapper}>
                  <MaterialIcons name="person" size={20} color="#9ca3af" />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your name (optional)"
                    placeholderTextColor="#9ca3af"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    testID="auth-name-input"
                  />
                </View>
              </>
            )}

            <Text style={styles.inputLabel}>Email</Text>
            <View style={styles.inputWrapper}>
              <MaterialIcons name="email" size={20} color="#9ca3af" />
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#9ca3af"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                testID="auth-email-input"
              />
            </View>

            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputWrapper}>
              <MaterialIcons name="lock" size={20} color="#9ca3af" />
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                testID="auth-password-input"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                testID="toggle-password-visibility"
              >
                <MaterialIcons
                  name={showPassword ? 'visibility' : 'visibility-off'}
                  size={20}
                  color="#9ca3af"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              testID="auth-submit-button"
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {isLogin ? 'Sign In' : 'Create Account'}
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.toggleButton}
              onPress={toggleMode}
              testID="toggle-auth-mode"
            >
              <Text style={styles.toggleButtonText}>
                {isLogin
                  ? "Don't have an account? "
                  : 'Already have an account? '}
                <Text style={styles.toggleButtonHighlight}>
                  {isLogin ? 'Register' : 'Sign In'}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <MaterialIcons name="info-outline" size={16} color="#1e3a8a" />
            <Text style={styles.infoText}>
              All registered users share the same firm data
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  kbContainer: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    justifyContent: 'center',
  },
  brandingContainer: { alignItems: 'center', marginBottom: 32 },
  logo: { width: 100, height: 100, marginBottom: 16 },
  firmName: {
    fontSize: 26, fontWeight: 'bold', color: '#1e3a8a',
    letterSpacing: 1, marginBottom: 4,
  },
  tagline: { fontSize: 14, color: '#6b7280' },
  formCard: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  formTitle: {
    fontSize: 22, fontWeight: 'bold',
    color: '#1f2937', marginBottom: 4,
  },
  formSubtitle: { fontSize: 14, color: '#6b7280', marginBottom: 20 },
  errorBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fee2e2', padding: 12, borderRadius: 8,
    marginBottom: 16, gap: 8,
  },
  errorText: { color: '#ef4444', fontSize: 13, flex: 1 },
  inputLabel: {
    fontSize: 13, fontWeight: '600', color: '#374151',
    marginBottom: 6, marginTop: 12,
  },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb',
    borderRadius: 10, paddingHorizontal: 12, gap: 8,
  },
  input: {
    flex: 1, paddingVertical: 12, fontSize: 15, color: '#1f2937',
  },
  submitButton: {
    backgroundColor: '#1e3a8a', borderRadius: 10,
    paddingVertical: 14, alignItems: 'center', marginTop: 24,
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: {
    color: '#ffffff', fontSize: 16, fontWeight: '600',
  },
  divider: {
    flexDirection: 'row', alignItems: 'center', marginVertical: 20,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  dividerText: {
    paddingHorizontal: 12, color: '#9ca3af',
    fontSize: 12, fontWeight: '600',
  },
  toggleButton: { alignItems: 'center', paddingVertical: 4 },
  toggleButtonText: { fontSize: 14, color: '#6b7280' },
  toggleButtonHighlight: { color: '#1e3a8a', fontWeight: '700' },
  infoBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#eff6ff', padding: 12, borderRadius: 8,
    marginTop: 20, gap: 8, justifyContent: 'center',
  },
  infoText: { fontSize: 12, color: '#1e3a8a', fontWeight: '500' },
});
