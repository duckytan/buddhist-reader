export const sutraManifest = [
  {
    id: 1,
    title: '般若波罗蜜多心经',
    slug: 'heart-sutra',
    category: 'prajna',
    translator: '玄奘',
    description: '简称《心经》，仅260字，浓缩600卷般若精华，是汉传佛教最广为传诵的短篇经文。',
    chapterCount: 1,
    totalChars: 260,
    coverUrl: null
  },
  {
    id: 2,
    title: '金刚般若波罗蜜经',
    slug: 'diamond-sutra',
    category: 'prajna',
    translator: '鸠摩罗什',
    description: '简称《金刚经》，以金刚喻般若之坚利，破除一切执著，是禅宗根本经典之一。',
    chapterCount: 32,
    totalChars: 5140,
    coverUrl: null
  },
  {
    id: 3,
    title: '佛说阿弥陀经',
    slug: 'amitabha-sutra',
    category: 'pure-land',
    translator: '鸠摩罗什',
    description: '净土宗核心经典，描述西方极乐世界的庄严妙境及持名念佛的修行方法。',
    chapterCount: 1,
    totalChars: 1860,
    coverUrl: null
  },
  {
    id: 4,
    title: '六祖坛经',
    slug: 'platform-sutra',
    category: 'chan',
    translator: '法海集记',
    description: '禅宗根本经典，记录六祖惠能大师得法传法经过及顿悟法门。',
    chapterCount: 10,
    totalChars: 14000,
    coverUrl: null
  },
  {
    id: 5,
    title: '大悲咒',
    slug: 'great-compassion-mantra',
    category: 'mantra',
    translator: '不空',
    description: '全称《千手千眼观世音菩萨广大圆满无碍大悲心陀罗尼》，是汉传佛教最常诵持的咒语之一。',
    chapterCount: 1,
    totalChars: 415,
    coverUrl: null
  }
]

export function getSutraBySlug(slug) {
  return sutraManifest.find(s => s.slug === slug) || null
}

export function getSutraById(id) {
  return sutraManifest.find(s => s.id === id) || null
}

export function listSutras(category = null) {
  if (category) {
    return sutraManifest.filter(s => s.category === category)
  }
  return sutraManifest
}

export function getSutraCategories() {
  const categories = new Set(sutraManifest.map(s => s.category))
  return Array.from(categories)
}
