import React, { useState, useRef } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, Image, ScrollView,
  ActivityIndicator, StatusBar, SafeAreaView, Platform, Alert, TextInput
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const COLORS = {
  bg: '#08080C',
  s1: '#0E0E14',
  s2: '#141419',
  s3: '#1C1C24',
  border: 'rgba(255,255,255,0.08)',
  text: '#F4F0FF',
  text2: '#9892B0',
  muted: '#4A4560',
  accent: '#FF4D1C',
  green: '#00E5A0',
  purple: '#8B5CF6',
  yellow: '#FFB800',
};

// URL do site EFFEMME e a chave de app gerada na tela
// EFFEMME → Configurações → "Chave de app externo (Snapost)".
// A chave da IA (Anthropic/Gemini) NUNCA fica aqui no app — ela mora
// só no servidor do WordPress, protegida.
const EFFEMME_API_URL = 'https://effemme.com.br/wp-json/effemme/v1/importar-foto';
const EFFEMME_APP_KEY = 'COLE_AQUI_A_CHAVE_GERADA_NO_WORDPRESS';

const NETWORKS = [
  { id: 'instagram', name: 'Instagram', emoji: '📸' },
  { id: 'facebook', name: 'Facebook', emoji: '👍' },
  { id: 'tiktok', name: 'TikTok', emoji: '🎵' },
  { id: 'linkedin', name: 'LinkedIn', emoji: '💼' },
  { id: 'twitter', name: 'X/Twitter', emoji: '𝕏' },
  { id: 'pinterest', name: 'Pinterest', emoji: '📌' },
  { id: 'threads', name: 'Threads', emoji: '@' },
  { id: 'youtube', name: 'YouTube', emoji: '▶' },
];

const STEPS = [
  { icon: '👁', label: 'Analisando imagem' },
  { icon: '✂', label: 'Otimizando qualidade' },
  { icon: '✍', label: 'Criando legenda' },
  { icon: '#', label: 'Gerando hashtags' },
  { icon: '🎯', label: 'Adaptando por rede' },
];

export default function App() {
  const [image, setImage] = useState(null);
  const [base64, setBase64] = useState(null);
  const [mimeType, setMimeType] = useState('image/jpeg');
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [errorStep, setErrorStep] = useState(-1);

  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState([]);
  const [imageTags, setImageTags] = useState([]);
  const [createdProduct, setCreatedProduct] = useState(null); // { postId, titulo, preco, editLink } — vem do EFFEMME

  const [selectedNets, setSelectedNets] = useState(new Set(['instagram', 'facebook']));
  const [publishing, setPublishing] = useState(false);
  const [postingNets, setPostingNets] = useState(new Set());
  const [postedNets, setPostedNets] = useState(new Set());
  const [success, setSuccess] = useState(false);
  const [postsCount, setPostsCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const scrollRef = useRef(null);

  // ── PICK IMAGE ──
  const pickImage = async (fromCamera) => {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!perm.granted) {
      Alert.alert('Permissão necessária', 'Permita o acesso para continuar.');
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({
          quality: 0.8,
          base64: true,
          allowsEditing: false,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
          base64: true,
          allowsEditing: false,
        });

    if (result.canceled) return;

    const asset = result.assets[0];
    setImage(asset.uri);
    setBase64(asset.base64);
    setMimeType(asset.mimeType || 'image/jpeg');

    // Reset and start AI
    setDone(false);
    setSuccess(false);
    setPostedNets(new Set());
    setCompletedSteps([]);
    setErrorStep(-1);
    setErrorMsg('');
    setCreatedProduct(null);
    runAI(asset.base64, asset.mimeType || 'image/jpeg');
  };

  // ── AI PIPELINE ──
  const runAI = async (b64, mime) => {
    setProcessing(true);
    setCurrentStep(0);
    await delay(500);
    setCompletedSteps([0]);
    setCurrentStep(1);
    await delay(400);
    setCompletedSteps([0, 1]);
    setCurrentStep(2);

    // Manda a foto pro nosso próprio site EFFEMME — não pra Anthropic
    // direto. O WordPress guarda a chave da IA em segredo no servidor
    // (o app nunca vê essa chave) e devolve tanto o produto criado no
    // catálogo quanto a legenda/hashtags pra postar nas redes.
    try {
      const res = await fetch(EFFEMME_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Effemme-App-Key': EFFEMME_APP_KEY,
        },
        body: JSON.stringify({
          foto_base64: b64,
          mime_type: mime,
          tipo_monetizacao: 'dropshipping',
        }),
      });

      const parsed = await res.json();
      if (!res.ok || !parsed.success) {
        throw new Error(parsed.message || `Erro ${res.status} ao criar produto`);
      }

      setCaption(parsed.legenda_social || '');
      setHashtags(parsed.hashtags_social || []);
      setImageTags([]); // a EFFEMME não devolve tags visuais separadas — a legenda já cobre isso
      setCreatedProduct({
        postId: parsed.post_id,
        titulo: parsed.titulo,
        preco: parsed.preco,
        editLink: parsed.edit_link,
      });

      setCompletedSteps([0, 1, 2]);
      setCurrentStep(3);
      await delay(300);
      setCompletedSteps([0, 1, 2, 3]);
      setCurrentStep(4);
      await delay(300);
      setCompletedSteps([0, 1, 2, 3, 4]);
      setCurrentStep(-1);
      setDone(true);

    } catch (e) {
      console.error(e);
      setErrorStep(2);
      setErrorMsg('Erro ao processar com IA. Verifique sua conexão e tente novamente.');
    }

    setProcessing(false);
  };

  // ── NETWORKS ──
  const toggleNet = (id) => {
    const next = new Set(selectedNets);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedNets(next);
  };

  const selectAll = () => {
    if (selectedNets.size === NETWORKS.length) {
      setSelectedNets(new Set());
    } else {
      setSelectedNets(new Set(NETWORKS.map(n => n.id)));
    }
  };

  // ── PUBLISH ──
  const publishAll = async () => {
    if (!done || selectedNets.size === 0) return;
    setPublishing(true);

    const nets = NETWORKS.filter(n => selectedNets.has(n.id));
    for (const net of nets) {
      setPostingNets(prev => new Set(prev).add(net.id));
      await delay(350 + Math.random() * 350);
      setPostingNets(prev => {
        const n = new Set(prev);
        n.delete(net.id);
        return n;
      });
      setPostedNets(prev => new Set(prev).add(net.id));
    }

    setPostsCount(c => c + 1);
    setPublishing(false);
    setSuccess(true);
  };

  // ── RESET ──
  const resetAll = () => {
    setImage(null);
    setBase64(null);
    setDone(false);
    setCaption('');
    setHashtags([]);
    setImageTags([]);
    setCreatedProduct(null);
    setSuccess(false);
    setPostedNets(new Set());
    setCompletedSteps([]);
    setCurrentStep(-1);
    setErrorStep(-1);
    setErrorMsg('');
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const selectedCount = selectedNets.size;
  const timeStr = `${postsCount * 65}m`;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.brandIcon}><Text style={{ fontSize: 16 }}>⚡</Text></View>
          <Text style={styles.brandName}>Snap<Text style={{ color: COLORS.accent }}>ost</Text></Text>
        </View>
        {(image || success) && (
          <TouchableOpacity onPress={resetAll} style={styles.resetBtn}>
            <Text style={styles.resetBtnText}>↺ Novo</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.scrollContent}>

        {/* STATS */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>POSTS</Text>
            <Text style={styles.statValue}>{postsCount}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>ECONOMIZADO</Text>
            <Text style={styles.statValue}>{timeStr}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>REDES</Text>
            <Text style={styles.statValue}>{selectedCount}</Text>
          </View>
        </View>

        {/* SUCCESS */}
        {success && (
          <View style={styles.successCard}>
            <Text style={styles.successEmoji}>🎉</Text>
            <Text style={styles.successTitle}>Publicado!</Text>
            <Text style={styles.successSub}>
              Postado em {postedNets.size} rede{postedNets.size > 1 ? 's' : ''} com sucesso
            </Text>
            <View style={styles.successNets}>
              {NETWORKS.filter(n => postedNets.has(n.id)).map(n => (
                <View key={n.id} style={styles.successNetChip}>
                  <Text style={styles.successNetText}>{n.emoji} {n.name}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity style={styles.newPostBtn} onPress={resetAll}>
              <Text style={styles.newPostBtnText}>✨ Criar novo post</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* UPLOAD ZONE */}
        {!image && !success && (
          <View style={styles.uploadCard}>
            <View style={styles.uploadIconWrap}>
              <Text style={{ fontSize: 32 }}>📸</Text>
            </View>
            <Text style={styles.uploadTitle}>Sua foto vira post automático</Text>
            <Text style={styles.uploadSub}>
              Selfie, comida, produto, lugar — a IA analisa, cria a legenda e publica em todas as redes
            </Text>

            <View style={styles.uploadBtns}>
              <TouchableOpacity style={styles.btnPrimary} onPress={() => pickImage(true)}>
                <Text style={styles.btnPrimaryText}>📷 Tirar foto</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSecondary} onPress={() => pickImage(false)}>
                <Text style={styles.btnSecondaryText}>🖼 Galeria</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* IMAGE PREVIEW */}
        {image && (
          <View style={styles.previewCard}>
            <Image source={{ uri: image }} style={styles.previewImg} />
            {imageTags.length > 0 && (
              <View style={styles.previewTagsRow}>
                {imageTags.slice(0, 4).map((t, i) => (
                  <View key={i} style={styles.previewTag}>
                    <Text style={styles.previewTagText}>{t}</Text>
                  </View>
                ))}
              </View>
            )}
            <TouchableOpacity style={styles.changePhotoBtn} onPress={() => pickImage(false)}>
              <Text style={styles.changePhotoText}>✏️ Trocar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* AI PIPELINE */}
        {image && (
          <View style={styles.pipelineCard}>
            <View style={styles.pipelineHeader}>
              <View style={[
                styles.aiDot,
                done && styles.aiDotDone,
                errorStep >= 0 && styles.aiDotErr,
              ]} />
              <Text style={styles.pipelineTitle}>Inteligência Artificial</Text>
              <Text style={styles.pipelineSub}>
                {errorStep >= 0 ? '⚠️ Erro' : done ? '✅ Pronto' : 'Processando...'}
              </Text>
            </View>

            <View style={styles.stepsCol}>
              {STEPS.map((step, i) => {
                const isDone = completedSteps.includes(i);
                const isActive = currentStep === i;
                const isErr = errorStep === i;
                return (
                  <View key={i} style={styles.stepRow}>
                    <View style={[
                      styles.stepCircle,
                      isDone && styles.stepCircleDone,
                      isActive && styles.stepCircleActive,
                      isErr && styles.stepCircleErr,
                    ]}>
                      {isActive ? (
                        <ActivityIndicator size="small" color={COLORS.purple} />
                      ) : (
                        <Text style={styles.stepIconText}>
                          {isDone ? '✓' : isErr ? '✕' : step.icon}
                        </Text>
                      )}
                    </View>
                    <Text style={[
                      styles.stepLabel,
                      isDone && styles.stepLabelDone,
                      isActive && styles.stepLabelActive,
                    ]}>
                      {step.label}
                    </Text>
                  </View>
                );
              })}
            </View>

            {errorMsg && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>⚠️ {errorMsg}</Text>
                <TouchableOpacity onPress={() => runAI(base64, mimeType)}>
                  <Text style={styles.retryText}>Tentar novamente</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* RESULTS */}
            {done && (
              <View style={styles.resultsArea}>
                {createdProduct && (
                  <View style={styles.productCard}>
                    <Text style={styles.productCardLabel}>🛍 PRODUTO CRIADO NO EFFEMME</Text>
                    <Text style={styles.productCardTitle}>{createdProduct.titulo}</Text>
                    <Text style={styles.productCardPrice}>
                      {createdProduct.preco ? `R$ ${Number(createdProduct.preco).toFixed(2)}` : 'preço a revisar'}
                    </Text>
                    <Text style={styles.productCardHint}>Salvo como rascunho — revise e publique no wp-admin.</Text>
                  </View>
                )}

                <Text style={styles.resultLabel}>📝 LEGENDA — edite se quiser</Text>
                <TextInput
                  style={styles.captionInput}
                  value={caption}
                  onChangeText={setCaption}
                  multiline
                  placeholder="Legenda..."
                  placeholderTextColor={COLORS.muted}
                />

                <Text style={[styles.resultLabel, { marginTop: 16 }]}>#️⃣ HASHTAGS</Text>
                <View style={styles.hashtagsWrap}>
                  {hashtags.map((h, i) => (
                    <View key={i} style={styles.hashtagChip}>
                      <Text style={styles.hashtagText}>#{h.replace(/^#/, '')}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* PUBLISH SECTION */}
        {image && done && (
          <View style={styles.pubCard}>
            <View style={styles.pubHeader}>
              <Text style={styles.pubTitle}>🚀 Publicar</Text>
              <TouchableOpacity onPress={selectAll}>
                <Text style={styles.selectAllText}>
                  {selectedNets.size === NETWORKS.length ? 'Limpar' : 'Todas'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.netsGrid}>
              {NETWORKS.map(net => {
                const isSel = selectedNets.has(net.id);
                const isPosting = postingNets.has(net.id);
                const isPosted = postedNets.has(net.id);
                return (
                  <TouchableOpacity
                    key={net.id}
                    style={[
                      styles.netChip,
                      isSel && styles.netChipSel,
                      isPosting && styles.netChipPosting,
                      isPosted && styles.netChipPosted,
                    ]}
                    onPress={() => toggleNet(net.id)}
                    disabled={publishing}
                  >
                    {isPosting ? (
                      <ActivityIndicator size="small" color={COLORS.yellow} />
                    ) : (
                      <Text style={[
                        styles.netChipText,
                        isSel && styles.netChipTextSel,
                        isPosted && styles.netChipTextPosted,
                      ]}>
                        {net.emoji} {net.name}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[
                styles.publishBtn,
                (selectedCount === 0 || publishing) && styles.publishBtnDisabled,
              ]}
              onPress={publishAll}
              disabled={selectedCount === 0 || publishing}
            >
              {publishing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.publishBtnText}>
                  ⚡ Publicar em {selectedCount} rede{selectedCount !== 1 ? 's' : ''}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandIcon: {
    width: 32, height: 32, backgroundColor: COLORS.accent, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  brandName: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  resetBtn: {
    backgroundColor: COLORS.s3, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
  },
  resetBtnText: { color: COLORS.text2, fontSize: 12, fontWeight: '500' },

  scroll: { flex: 1 },
  scrollContent: { padding: 16 },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: COLORS.s1, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, padding: 12,
  },
  statLabel: { fontSize: 9, color: COLORS.muted, letterSpacing: 1, marginBottom: 6 },
  statValue: { fontSize: 22, fontWeight: '800', color: COLORS.text },

  uploadCard: {
    backgroundColor: COLORS.s1, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 18, padding: 28, alignItems: 'center', marginBottom: 16,
  },
  uploadIconWrap: {
    width: 64, height: 64, backgroundColor: 'rgba(255,77,28,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,77,28,0.15)', borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  uploadTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 8, textAlign: 'center' },
  uploadSub: { fontSize: 13, color: COLORS.text2, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  uploadBtns: { flexDirection: 'row', gap: 10, width: '100%' },
  btnPrimary: {
    flex: 1, backgroundColor: COLORS.accent, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', shadowColor: COLORS.accent, shadowOpacity: 0.4,
    shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
  },
  btnPrimaryText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  btnSecondary: {
    flex: 1, backgroundColor: COLORS.s3, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  btnSecondaryText: { color: COLORS.text2, fontWeight: '600', fontSize: 14 },

  previewCard: { marginBottom: 16, borderRadius: 16, overflow: 'hidden' },
  previewImg: { width: '100%', height: 280, borderRadius: 16 },
  previewTagsRow: {
    position: 'absolute', top: 10, left: 10, right: 70, flexDirection: 'row',
    flexWrap: 'wrap', gap: 5,
  },
  previewTag: {
    backgroundColor: 'rgba(8,8,12,0.75)', borderRadius: 100,
    paddingHorizontal: 9, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  previewTagText: { color: '#fff', fontSize: 11 },
  changePhotoBtn: {
    position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(8,8,12,0.8)',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: COLORS.border,
  },
  changePhotoText: { color: COLORS.text2, fontSize: 12 },

  pipelineCard: {
    backgroundColor: COLORS.s1, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 18, marginBottom: 16, overflow: 'hidden',
  },
  pipelineHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  aiDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.purple },
  aiDotDone: { backgroundColor: COLORS.green },
  aiDotErr: { backgroundColor: '#FF3A5C' },
  pipelineTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  pipelineSub: { fontSize: 11, color: COLORS.muted, marginLeft: 'auto' },

  stepsCol: { padding: 16, gap: 12 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepCircle: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.s3,
    borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center',
  },
  stepCircleDone: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  stepCircleActive: { borderColor: COLORS.purple, backgroundColor: 'rgba(139,92,246,0.1)' },
  stepCircleErr: { backgroundColor: '#FF3A5C', borderColor: '#FF3A5C' },
  stepIconText: { fontSize: 12, color: COLORS.muted },
  stepLabel: { fontSize: 13, color: COLORS.muted },
  stepLabelDone: { color: COLORS.green },
  stepLabelActive: { color: COLORS.text2, fontWeight: '600' },

  errorBanner: {
    margin: 16, marginTop: 0, backgroundColor: 'rgba(255,58,92,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,58,92,0.2)', borderRadius: 10, padding: 12,
  },
  errorBannerText: { color: '#ff8099', fontSize: 12, marginBottom: 6 },
  retryText: { color: COLORS.accent, fontSize: 12, fontWeight: '700' },

  resultsArea: { padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border },
  productCard: {
    backgroundColor: 'rgba(0,229,160,0.06)', borderWidth: 1, borderColor: 'rgba(0,229,160,0.2)',
    borderRadius: 12, padding: 14, marginBottom: 16,
  },
  productCardLabel: { fontSize: 10, color: COLORS.green, letterSpacing: 1.5, marginBottom: 6, fontWeight: '700' },
  productCardTitle: { fontSize: 15, color: COLORS.text, fontWeight: '700', marginBottom: 4 },
  productCardPrice: { fontSize: 18, color: COLORS.green, fontWeight: '800', marginBottom: 4 },
  productCardHint: { fontSize: 11, color: COLORS.text2 },
  resultLabel: { fontSize: 10, color: COLORS.muted, letterSpacing: 1.5, marginBottom: 8 },
  captionInput: {
    backgroundColor: COLORS.s2, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: 10, padding: 12, color: COLORS.text, fontSize: 13,
    lineHeight: 20, minHeight: 100, textAlignVertical: 'top',
  },
  hashtagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  hashtagChip: {
    backgroundColor: 'rgba(255,77,28,0.08)', borderWidth: 1, borderColor: 'rgba(255,77,28,0.15)',
    borderRadius: 6, paddingHorizontal: 9, paddingVertical: 4,
  },
  hashtagText: { color: COLORS.accent, fontSize: 12 },

  pubCard: {
    backgroundColor: COLORS.s1, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 18, padding: 16, marginBottom: 16,
  },
  pubHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  pubTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  selectAllText: { fontSize: 12, color: COLORS.accent, fontWeight: '600' },

  netsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  netChip: {
    backgroundColor: COLORS.s2, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, minWidth: 90,
    alignItems: 'center',
  },
  netChipSel: { borderColor: COLORS.green, backgroundColor: 'rgba(0,229,160,0.06)' },
  netChipPosting: { borderColor: COLORS.yellow, backgroundColor: 'rgba(255,184,0,0.06)' },
  netChipPosted: { borderColor: COLORS.green, backgroundColor: 'rgba(0,229,160,0.08)' },
  netChipText: { color: COLORS.text2, fontSize: 12 },
  netChipTextSel: { color: COLORS.green, fontWeight: '600' },
  netChipTextPosted: { color: COLORS.green, fontWeight: '600' },

  publishBtn: {
    backgroundColor: COLORS.accent, borderRadius: 12, paddingVertical: 15, alignItems: 'center',
    shadowColor: COLORS.accent, shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 6 },
  },
  publishBtnDisabled: { opacity: 0.4 },
  publishBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  successCard: {
    backgroundColor: COLORS.s1, borderWidth: 1, borderColor: 'rgba(0,229,160,0.2)',
    borderRadius: 18, padding: 28, alignItems: 'center', marginBottom: 16,
  },
  successEmoji: { fontSize: 44, marginBottom: 12 },
  successTitle: { fontSize: 24, fontWeight: '800', color: COLORS.green, marginBottom: 8 },
  successSub: { fontSize: 13, color: COLORS.text2, textAlign: 'center', marginBottom: 18, lineHeight: 20 },
  successNets: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, justifyContent: 'center', marginBottom: 20 },
  successNetChip: {
    backgroundColor: 'rgba(0,229,160,0.08)', borderWidth: 1, borderColor: 'rgba(0,229,160,0.2)',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5,
  },
  successNetText: { color: COLORS.green, fontSize: 12 },
  newPostBtn: {
    backgroundColor: COLORS.s3, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 100, paddingHorizontal: 24, paddingVertical: 11,
  },
  newPostBtnText: { color: COLORS.text, fontWeight: '700', fontSize: 13 },
});
