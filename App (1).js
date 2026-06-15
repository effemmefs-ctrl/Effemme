import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Image, ScrollView, StyleSheet,
  ActivityIndicator, StatusBar, SafeAreaView, Platform, Alert, TextInput
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const COLORS = {
  bg: '#08080C',
  s1: '#111118',
  s2: '#16161F',
  s3: '#1C1C28',
  accent: '#FF4500',
  accentDim: 'rgba(255,69,0,0.15)',
  green: '#00E5A0',
  greenDim: 'rgba(0,229,160,0.1)',
  text: '#FFFFFF',
  text2: '#8888AA',
  text3: '#555566',
  border: 'rgba(255,255,255,0.07)',
};

const API_URL = 'https://effemme.vercel.app/api/analyze';

const NETWORKS = [
  { id: 'instagram', label: 'Instagram', color: '#E1306C', emoji: '📸' },
  { id: 'tiktok', label: 'TikTok', color: '#00F2EA', emoji: '🎵' },
  { id: 'twitter', label: 'Twitter/X', color: '#1DA1F2', emoji: '🐦' },
  { id: 'facebook', label: 'Facebook', color: '#1877F2', emoji: '👥' },
  { id: 'linkedin', label: 'LinkedIn', color: '#0A66C2', emoji: '💼' },
];

export default function App() {
  const [photo, setPhoto] = useState(null);
  const [photoBase64, setPhotoBase64] = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('');
  const [result, setResult] = useState(null);
  const [selectedNets, setSelectedNets] = useState(['instagram', 'tiktok', 'twitter', 'facebook', 'linkedin']);
  const [activeTab, setActiveTab] = useState('instagram');
  const [caption, setCaption] = useState('');
  const [published, setPublished] = useState(false);
  const [posts, setPosts] = useState(0);
  const [timeSaved, setTimeSaved] = useState(0);

  const pickImage = async (useCamera) => {
    const perm = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!perm.granted) {
      Alert.alert('Permissão necessária', 'Precisamos acessar sua ' + (useCamera ? 'câmera' : 'galeria'));
      return;
    }

    const opts = { base64: true, quality: 0.8, mediaTypes: ImagePicker.MediaTypeOptions.Images };
    const res = useCamera
      ? await ImagePicker.launchCameraAsync(opts)
      : await ImagePicker.launchImageLibraryAsync(opts);

    if (!res.canceled && res.assets?.[0]) {
      const asset = res.assets[0];
      setPhoto(asset.uri);
      setPhotoBase64(asset.base64);
      setResult(null);
      setPublished(false);
      analyzePhoto(asset.base64);
    }
  };

  const analyzePhoto = async (base64) => {
    setLoading(true);
    setResult(null);
    setPublished(false);

    try {
      setStep('🔍 Analisando imagem...');
      await sleep(600);
      setStep('✨ Otimizando qualidade...');
      await sleep(400);
      setStep('✍️ Criando legenda...');

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mediaType: 'image/jpeg' }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setStep('# Gerando hashtags...');
      await sleep(300);

      setResult(data);
      setCaption(data.instagram || '');
      setActiveTab('instagram');
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível analisar a foto. Tente novamente.\n' + e.message);
    } finally {
      setLoading(false);
      setStep('');
    }
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const toggleNet = (id) => {
    setSelectedNets(prev =>
      prev.includes(id) ? prev.filter(n => n !== id) : [...prev, id]
    );
  };

  const publish = async () => {
    if (selectedNets.length === 0) {
      Alert.alert('Selecione ao menos uma rede');
      return;
    }
    setLoading(true);
    setStep('📤 Publicando...');
    await sleep(1800);
    setLoading(false);
    setStep('');
    setPublished(true);
    setPosts(p => p + 1);
    setTimeSaved(t => t + 65);
  };

  const reset = () => {
    setPhoto(null);
    setPhotoBase64(null);
    setResult(null);
    setPublished(false);
    setCaption('');
  };

  const getCaptionForTab = (tab) => {
    if (!result) return '';
    return result[tab] || result.instagram || '';
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* Header */}
      <View style={s.header}>
        <View style={s.logo}>
          <View style={s.logoIcon}><Text style={s.logoEmoji}>⚡</Text></View>
          <Text style={s.logoText}>Snap<Text style={s.logoAccent}>ost</Text></Text>
        </View>
        {photo && (
          <TouchableOpacity onPress={reset} style={s.newBtn}>
            <Text style={s.newBtnText}>↺ Novo</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        {[
          { label: 'POSTS', value: posts },
          { label: 'ECONOMIZADO', value: timeSaved > 0 ? `${timeSaved}m` : '0m' },
          { label: 'REDES', value: selectedNets.length },
        ].map(st => (
          <View key={st.label} style={s.statCard}>
            <Text style={s.statLabel}>{st.label}</Text>
            <Text style={s.statValue}>{st.value}</Text>
          </View>
        ))}
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Upload area */}
        {!photo ? (
          <View style={s.uploadCard}>
            <Text style={s.uploadEmoji}>📸</Text>
            <Text style={s.uploadTitle}>Sua foto vira post automático</Text>
            <Text style={s.uploadSub}>Selfie, comida, produto, lugar — a IA analisa, cria a legenda e publica em todas as redes</Text>
            <View style={s.uploadBtns}>
              <TouchableOpacity style={s.primaryBtn} onPress={() => pickImage(true)}>
                <Text style={s.primaryBtnText}>📷 Tirar foto</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.secondaryBtn} onPress={() => pickImage(false)}>
                <Text style={s.secondaryBtnText}>🖼 Galeria</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            {/* Photo preview */}
            <View style={s.photoWrap}>
              <Image source={{ uri: photo }} style={s.photo} resizeMode="cover" />
              <TouchableOpacity style={s.changeBtn} onPress={() => pickImage(false)}>
                <Text style={s.changeBtnText}>✏️ Trocar</Text>
              </TouchableOpacity>
            </View>

            {/* Loading state */}
            {loading && (
              <View style={s.loadingCard}>
                <View style={s.loadingHeader}>
                  <ActivityIndicator color={COLORS.accent} size="small" />
                  <Text style={s.loadingTitle}>Inteligência Artificial</Text>
                </View>
                {['Analisando imagem', 'Otimizando qualidade', 'Criando legenda', 'Gerando hashtags'].map((st, i) => {
                  const done = step.includes(st.split(' ')[0]) ? false : i < 2;
                  const active = step.toLowerCase().includes(st.toLowerCase().split(' ')[0]);
                  return (
                    <View key={st} style={s.stepRow}>
                      <View style={[s.stepDot, done && s.stepDotDone, active && s.stepDotActive]}>
                        <Text style={s.stepDotText}>{done ? '✓' : active ? '◉' : '#'}</Text>
                      </View>
                      <Text style={[s.stepText, done && s.stepTextDone, active && s.stepTextActive]}>{st}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Result */}
            {result && !loading && !published && (
              <>
                {/* Network selector */}
                <View style={s.section}>
                  <Text style={s.sectionLabel}>REDES SELECIONADAS</Text>
                  <View style={s.netGrid}>
                    {NETWORKS.map(n => (
                      <TouchableOpacity
                        key={n.id}
                        style={[s.netChip, selectedNets.includes(n.id) && { borderColor: n.color, backgroundColor: n.color + '18' }]}
                        onPress={() => toggleNet(n.id)}
                      >
                        <Text style={s.netChipEmoji}>{n.emoji}</Text>
                        <Text style={[s.netChipText, selectedNets.includes(n.id) && { color: n.color }]}>{n.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Caption tabs */}
                <View style={s.section}>
                  <Text style={s.sectionLabel}>LEGENDA POR REDE</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabs}>
                    {NETWORKS.filter(n => selectedNets.includes(n.id)).map(n => (
                      <TouchableOpacity
                        key={n.id}
                        style={[s.tab, activeTab === n.id && { borderBottomColor: n.color }]}
                        onPress={() => { setActiveTab(n.id); setCaption(getCaptionForTab(n.id)); }}
                      >
                        <Text style={[s.tabText, activeTab === n.id && { color: '#fff' }]}>{n.emoji} {n.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <TextInput
                    style={s.captionInput}
                    value={activeTab === 'instagram' ? caption : getCaptionForTab(activeTab)}
                    onChangeText={activeTab === 'instagram' ? setCaption : undefined}
                    multiline
                    numberOfLines={4}
                    placeholderTextColor={COLORS.text3}
                  />
                </View>

                {/* Hashtags */}
                {result.hashtags && (
                  <View style={s.section}>
                    <Text style={s.sectionLabel}>HASHTAGS</Text>
                    <View style={s.hashWrap}>
                      {result.hashtags.map((h, i) => (
                        <View key={i} style={s.hashChip}>
                          <Text style={s.hashText}>#{h.replace('#', '')}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Publish */}
                <TouchableOpacity style={s.publishBtn} onPress={publish}>
                  <Text style={s.publishBtnText}>⚡ Publicar em {selectedNets.length} rede{selectedNets.length > 1 ? 's' : ''}</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Success */}
            {published && (
              <View style={s.successCard}>
                <Text style={s.successEmoji}>🎉</Text>
                <Text style={s.successTitle}>Publicado!</Text>
                <Text style={s.successSub}>Seu post foi publicado automaticamente em {selectedNets.length} redes sociais. Você economizou 65 minutos!</Text>
                <View style={s.successNets}>
                  {NETWORKS.filter(n => selectedNets.includes(n.id)).map(n => (
                    <View key={n.id} style={s.successNetChip}>
                      <Text style={s.successNetText}>✓ {n.label}</Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity style={s.newPostBtn} onPress={reset}>
                  <Text style={s.newPostBtnText}>+ Novo post</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  logo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.accent, justifyContent: 'center', alignItems: 'center' },
  logoEmoji: { fontSize: 18 },
  logoText: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  logoAccent: { color: COLORS.accent },
  newBtn: { backgroundColor: COLORS.s3, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: COLORS.border },
  newBtnText: { color: COLORS.text2, fontSize: 13, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 10, padding: 16 },
  statCard: { flex: 1, backgroundColor: COLORS.s1, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  statLabel: { fontSize: 9, color: COLORS.text3, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  statValue: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  scroll: { flex: 1 },
  uploadCard: { margin: 16, backgroundColor: COLORS.s1, borderRadius: 20, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  uploadEmoji: { fontSize: 48, marginBottom: 16 },
  uploadTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, textAlign: 'center', marginBottom: 10 },
  uploadSub: { fontSize: 14, color: COLORS.text2, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  uploadBtns: { flexDirection: 'row', gap: 12, width: '100%' },
  primaryBtn: { flex: 1, backgroundColor: COLORS.accent, borderRadius: 14, paddingVertical: 16, alignItems: 'center', shadowColor: COLORS.accent, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  secondaryBtn: { flex: 1, backgroundColor: COLORS.s3, borderRadius: 14, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  secondaryBtnText: { color: COLORS.text, fontWeight: '700', fontSize: 15 },
  photoWrap: { margin: 16, borderRadius: 20, overflow: 'hidden', position: 'relative' },
  photo: { width: '100%', height: 280 },
  changeBtn: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  changeBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  loadingCard: { margin: 16, backgroundColor: COLORS.s1, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: COLORS.border },
  loadingHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  loadingTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  stepDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.s3, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  stepDotDone: { backgroundColor: COLORS.greenDim, borderColor: COLORS.green },
  stepDotActive: { backgroundColor: COLORS.accentDim, borderColor: COLORS.accent },
  stepDotText: { fontSize: 11, color: COLORS.text2 },
  stepText: { fontSize: 14, color: COLORS.text3 },
  stepTextDone: { color: COLORS.green },
  stepTextActive: { color: COLORS.text, fontWeight: '600' },
  section: { marginHorizontal: 16, marginBottom: 16 },
  sectionLabel: { fontSize: 10, color: COLORS.text3, fontWeight: '700', letterSpacing: 1.5, marginBottom: 10 },
  netGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  netChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.s1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: COLORS.border },
  netChipEmoji: { fontSize: 14 },
  netChipText: { fontSize: 13, color: COLORS.text2, fontWeight: '600' },
  tabs: { marginBottom: 12 },
  tab: { paddingHorizontal: 16, paddingVertical: 10, marginRight: 4, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 13, color: COLORS.text3, fontWeight: '600' },
  captionInput: { backgroundColor: COLORS.s1, borderRadius: 14, padding: 16, color: COLORS.text, fontSize: 14, lineHeight: 22, borderWidth: 1, borderColor: COLORS.border, minHeight: 100, textAlignVertical: 'top' },
  hashWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hashChip: { backgroundColor: COLORS.accentDim, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,69,0,0.3)' },
  hashText: { color: COLORS.accent, fontSize: 12, fontWeight: '600' },
  publishBtn: { marginHorizontal: 16, backgroundColor: COLORS.accent, borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginBottom: 16, shadowColor: COLORS.accent, shadowOpacity: 0.5, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
  publishBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  successCard: { margin: 16, backgroundColor: COLORS.s1, borderRadius: 20, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,229,160,0.2)' },
  successEmoji: { fontSize: 48, marginBottom: 12 },
  successTitle: { fontSize: 26, fontWeight: '800', color: COLORS.green, marginBottom: 8 },
  successSub: { fontSize: 14, color: COLORS.text2, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  successNets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 24 },
  successNetChip: { backgroundColor: 'rgba(0,229,160,0.08)', borderWidth: 1, borderColor: 'rgba(0,229,160,0.2)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  successNetText: { color: COLORS.green, fontSize: 12 },
  newPostBtn: { backgroundColor: COLORS.s3, borderWidth: 1, borderColor: COLORS.border, borderRadius: 100, paddingHorizontal: 24, paddingVertical: 11 },
  newPostBtnText: { color: COLORS.text, fontWeight: '700', fontSize: 13 },
});
