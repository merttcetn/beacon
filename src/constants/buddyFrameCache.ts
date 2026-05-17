// MOCK: Demo için sabit /v1/sport yanıtları (önceki buddy_frame cache override edildi).
// Spor aleti videosundan 3 frame'in Pattern C çıktısı. Sunum sırasında VLM gecikmesinden
// bağımsız, deterministik bir akış için cache'liyoruz. Sunum sonrası temizlenecek.
// On/off kontrolü için useDebugStore.vlmBypass kullanılır.

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
      'Karşımızda, eliptik bisiklet benzeri, kolları ve bacakları aynı anda çalıştıran bir yürüyüş aleti bulunuyor. Görünüşe göre güvenli bir alet, ancak binerken ve inerken dengenize dikkat etmelisiniz. Ayaklarınızı turuncu renkli, yatay konumdaki platformlara yerleştirin ve yukarı doğru uzanan hareketli kolları ellerinizle kavrayın. Ardından, bir bacağınızı ileri iterken aynı taraftaki kolu kendinize doğru çekerek ve diğer taraf için de tersini yaparak yürüyüş hareketine başlayabilirsiniz. Bu alet özellikle bacak, kalça ve kol kaslarınızı çalıştırmak için harikadır.',
    priority: 'low',
    data: {
      immediate_warnings: [],
      upcoming_known_issues: [],
    },
  },
  {
    speak_text:
      'Tam önünde açık hava parklarında sıkça bulunan bir uzay yürüyüşü aleti var. Güvenliğin için alete adım atmadan önce mutlaka üst kısımdaki tutamakları iki elinle sıkıca kavramalısın, çünkü alttaki pedallar serbestçe sallanıyor ve dengeni bozabilir. Tutamakları sıkıca tuttuktan sonra ayaklarını sırayla aşağıdaki turuncu pedallara yerleştir. Sonrasında sırtını dik tutarak, sanki havada uzun adımlarla yürüyormuş gibi bacaklarını öne ve arkaya doğru ritmik olarak sallamaya başlayabilirsin. Bu egzersiz hem bacak ve kalça kaslarını çalıştırır hem de güzel bir kardiyo yapmanı sağlar.',
    priority: 'low',
    data: {
      immediate_warnings: [],
      upcoming_known_issues: [],
    },
  },
  {
    speak_text:
      'Önünüzde bir dış mekan mekik sehpası bulunuyor. Zemin sert beton, bu yüzden alete yaklaşırken dikkatli olmanızı tavsiye ederim. Bu alet, karın ve merkez bölge kaslarınızı çalıştırmak için tasarlanmıştır. Kullanmak için eğimli kısma sırtüstü yatın ve ayaklarınızı alt kısımdaki barlara sabitleyin. Karın kaslarınızı kullanarak gövdenizi yavaşça kaldırıp indirin. Hareket sırasında boynunuzu zorlamamaya ve dengenizi korumaya özen gösterin.',
    priority: 'low',
    data: {
      immediate_warnings: [],
      upcoming_known_issues: [],
    },
  },
];
