// src/constants/buddyScripts.ts
// MOCK: Buddy Mode için tüm TTS metinleri ve sahte aletler.
// Gerçek VLM/STT/konum bağlanmıyor — hackathon demo amaçlı sabit script'ler.

export const BUDDY_SCRIPTS = {
  // 0. İzin reddi
  micPermissionDenied:
    'Seni duyamıyorum. Lütfen ayarlardan mikrofon iznini açar mısın?',

  // 1. Açılış — mod seçimi
  modeQuestion:
    'Merhaba. Bugün ne yapmak istersin? Birinci seçenek, spor. İkinci seçenek, yürüyüş.',

  // 2. Yürüyüş akışı
  walkDurationQuestion: 'Kaç dakika yürümek istersin?',
  walkRouteFound: (mins: number) =>
    `Tamam. Çevrende en az sorun olan, düz bir alanda ${mins} dakikalık bir rota buldum. Şimdi başlıyoruz.`,
  walkWarnings: [
    'Yaklaşık 5 metre ileride, sağında geniş bir çukur var.',
    'Az ileride sarı dokunsal yüzeye gireceksin, 12 metre.',
    'Sağında bir bank var, yaklaşık 2 metre mesafede.',
    'Yolun düz devam ediyor, herhangi bir engel görmüyorum.',
  ],

  // 3. Spor akışı
  sportSearching:
    'En yakın spor yapabileceğin alanları seçiyorum. Yaklaşık 120 metre ileride, açık alan spor parkı var. Seni oraya yönlendiriyorum.',
  sportArrived:
    'Spor alanına geldin. Karşında ilk alet var.',
  sportDone:
    'Bütün aletleri bitirdin. Harika iş çıkardın.',
  sportNextCue: 'Tamam, başka bir harekete geçelim.',
} as const;

export interface SportEquipment {
  name: string;
  speakText: string;
}

// MOCK: VLM görsel tanıma yerine elle yazılmış aletler.
export const SPORT_EQUIPMENTS: SportEquipment[] = [
  {
    name: 'Bisiklet aleti',
    speakText:
      'Karşında sabit bir bisiklet aleti var. Önce selesine otur, ayaklarını pedallara yerleştir, gidona iki elinle tutun. Sonra pedalları öne doğru çevirmeye başla. Bacak kaslarını çalıştırır.',
  },
  {
    name: 'Bel rotasyon aleti',
    speakText:
      'Karşında bel rotasyon aleti var. Üstteki kola iki elinle tutun, ayaklarını dönen platformun üzerine koy. Ardından belini önce sağa, sonra sola çevir. Bel ve karın bölgeni esnetir.',
  },
  {
    name: 'Bacak presi',
    speakText:
      'Karşında bacak presi aleti var. Sırtını dayağa yasla, ayaklarını öndeki metal platforma koy. Sonra bacaklarını yavaşça it ve kontrollü şekilde geri çek. Bacak ve kalça kaslarını güçlendirir.',
  },
];

export type WalkDuration = 10 | 20 | 30;
export const WALK_DURATIONS: WalkDuration[] = [10, 20, 30];
