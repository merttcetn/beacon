// MOCK: Demo için sabit buddy_frame yanıtları. Backend gerçek bir oturumda
// üretmişti; sunum sırasında VLM gecikmesinden bağımsız, deterministic bir
// akış istediğimiz için cache'liyoruz. Sunum sonrası temizlenecek.

export const USE_CACHE = true;

// Her TTS bittikten sonra sıradaki olayı tetiklemeden önceki sessizlik.
export const BUDDY_CACHE_DELAY_MS = 3000;

export type BuddyCachePriority = 'low' | 'medium' | 'high' | 'critical';

export interface BuddyCacheEvent {
  speak_text: string;
  priority: BuddyCachePriority;
  data: {
    immediate_warnings: string[];
    upcoming_known_issues: string[];
  };
}

export const BUDDY_FRAME_CACHE: BuddyCacheEvent[] = [
  {
    speak_text:
      'Tam önündeki kumaş kaplı bir eşyaya çok yaklaştın, ilerisi tamamen kapalı.',
    priority: 'critical',
    data: {
      immediate_warnings: ['Tam önünde kumaş kaplı bir engele çok yakınsın.'],
      upcoming_known_issues: [],
    },
  },
  {
    speak_text:
      'Önünde sağ taraftaki masada çalışan biri var ve oturduğu sandalye hafifçe yoluna taşıyor. Ona çarpmamak için sol tarafındaki geniş boşluğu kullanarak yanından ilerleyebilirsin.',
    priority: 'high',
    data: {
      immediate_warnings: [
        'Önünde sağ taraftaki masada oturan bir kişi ve tekerlekli sandalyesi bulunuyor.',
      ],
      upcoming_known_issues: [],
    },
  },
  {
    speak_text:
      'Sol ön tarafında büyük bir çalışma masası ve tekerlekli sandalyeler bulunuyor. İlerlemek için sağındaki daha açık alanı tercih edebilirsin.',
    priority: 'low',
    data: {
      immediate_warnings: [],
      upcoming_known_issues: [],
    },
  },
  {
    speak_text:
      'Önündeki geçiş alanı düz ve oldukça geniş. Sol tarafında ahşap basamaklı bir platform, sağında ise çalışma sandalyeleri bulunuyor; tam karşıya doğru rahatça ilerleyebilirsin.',
    priority: 'low',
    data: {
      immediate_warnings: [],
      upcoming_known_issues: [],
    },
  },
  {
    speak_text:
      'Yönünü değiştirdin, şu an önündeki geniş koridor açık ve düz. Solunda ahşap bir masa, sağında ise çalışma masaları yer alıyor; ortadan rahatça ilerleyebilirsin.',
    priority: 'low',
    data: {
      immediate_warnings: [],
      upcoming_known_issues: [],
    },
  },
  {
    speak_text:
      'Sağ tarafındaki duvar boyunca büyük turuncu yapılar ve yola hafifçe taşan ince ayaklı bir sandalye bulunuyor. Önündeki zemin açık, solundaki uzun çalışma masalarının yanından düz devam edebilirsin.',
    priority: 'medium',
    data: {
      immediate_warnings: [
        'Sağ tarafında, yürüme alanına hafifçe taşan ince ayaklı bir sandalye bulunuyor.',
      ],
      upcoming_known_issues: [],
    },
  },
  {
    speak_text:
      'Dikkat, tam önünde adım atma mesafesinde alçak bir sehpa var. İlerisi de ahşap bir bariyerle kapalı, bu yönde geçiş alanı bulunmuyor.',
    priority: 'critical',
    data: {
      immediate_warnings: [
        'Tam önünde alçak, dikdörtgen bir sehpa var.',
        'İlerisi ahşap bir bariyerle kapalı.',
      ],
      upcoming_known_issues: [],
    },
  },
  {
    speak_text: 'Ahşap tezgaha çok yaklaştın, düz ilerisi tamamen kapalı.',
    priority: 'high',
    data: {
      immediate_warnings: ['Yolu tamamen kapatan ahşap tezgaha çok yakınsın.'],
      upcoming_known_issues: [],
    },
  },
  {
    speak_text:
      'Önündeki alan düz ve açık, sol taraftan rahatça ilerleyebilirsin. Sağında uzun bir masa ve çalışma sandalyeleri bulunuyor.',
    priority: 'low',
    data: {
      immediate_warnings: [],
      upcoming_known_issues: [],
    },
  },
  {
    speak_text:
      'Hemen solunda bir kolonun yanından geçiyorsun, önündeki yol düz ve açık. Biraz ileride sağ tarafında ise ahşap basamaklı bir alan bulunuyor.',
    priority: 'medium',
    data: {
      immediate_warnings: ['Hemen solunda bir kolon var.'],
      upcoming_known_issues: [],
    },
  },
  {
    speak_text:
      'Dikkat, tam önünde ahşap bir kapı veya duvar bulunuyor, düz ilerisi kapalı. Sadece sağ tarafında yuvarlak sehpaların olduğu dar bir geçiş görünüyor.',
    priority: 'high',
    data: {
      immediate_warnings: ['Tam önünde yolunu kapatan ahşap bir yüzey var.'],
      upcoming_known_issues: [],
    },
  },
  {
    speak_text:
      'Hemen solunda iki alçak sehpa, sağında ise bir masa ayağı var. Bu engellerin arasından düz devam edebilirsin. Yaklaşık üç metre ileride sol tarafta geniş beton bir kolon bulunuyor.',
    priority: 'high',
    data: {
      immediate_warnings: [
        'Hemen solunda yola taşan iki adet alçak sehpa var.',
        'Sağ tarafında, adım hizasında bir çalışma masasının ayağı bulunuyor.',
      ],
      upcoming_known_issues: [
        'Yaklaşık 3 metre ileride sol tarafta geniş beton bir kolon var.',
        'İleride sağ tarafta yükseltilmiş ahşap bir platform bulunuyor.',
      ],
    },
  },
  {
    speak_text:
      'Önündeki koridor açık, sol tarafına doğru ilerleyebilirsin. Hemen sağında büyük, mavi bir koltuk bulunuyor.',
    priority: 'low',
    data: {
      immediate_warnings: [
        'Sağ tarafında, yaklaşık iki adım önde, zemine yakın bir koltuk arkalığı var.',
      ],
      upcoming_known_issues: [],
    },
  },
];
