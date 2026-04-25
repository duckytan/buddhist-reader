/**
 * 动态经文配置
 * 经文 TXT 文件应放在 public/sutras/ 目录下
 * 例如: public/sutras/xin-jing.txt
 */

export const dynamicSutras = [
  {
    id: 'xin-jing-dynamic',
    title: '心经',
    fullName: '《般若波罗蜜多心经》',
    translator: '唐三藏法师玄奘译',
    cover: '📖',
    description: '般若经类中最短的一部，共260字，是大乘佛教的核心经典之一',
    wordCount: 260,
    chapters: [
      {
        title: '全文',
        url: '/sutras/xin-jing.txt'
      }
    ]
  },
  {
    id: 'da-cheng-qi-xin-lun',
    title: '大乘起信论',
    fullName: '《大乘起信论》',
    translator: '梁真谛译',
    cover: '🌟',
    description: '大乘佛教重要论典，阐释阿赖耶识思想',
    wordCount: 15000,
    chapters: [
      {
        title: '全文',
        url: '/sutras/《大乘起信论》.txt'
      }
    ]
  },
  {
    id: 'fa-puti-xin-lun',
    title: '发菩提心论',
    fullName: '《发菩提心论》',
    translator: '龙树菩萨造',
    cover: '🌸',
    description: '阐述发菩提心的方法和利益',
    wordCount: 8000,
    chapters: [
      {
        title: '全文',
        url: '/sutras/《发菩提心论》.txt'
      }
    ]
  },
  {
    id: 'ba-shi-gui-ju-song',
    title: '八识规矩颂',
    fullName: '《八识规矩颂释》',
    translator: '玄奘法师',
    cover: '📜',
    description: '唯识学入门重要颂文',
    wordCount: 5000,
    chapters: [
      {
        title: '全文',
        url: '/sutras/《八识规矩颂释》.txt'
      }
    ]
  },
  {
    id: 'jing-zong-ming-xin-jian-xing',
    title: '禅宗明心见性与密宗即身成佛',
    fullName: '《禅宗明心见性与密宗即身成佛》',
    translator: '冯达庵',
    cover: '💎',
    description: '冯达庵居士阐述禅宗与密宗的比较',
    wordCount: 10000,
    chapters: [
      {
        title: '全文',
        url: '/sutras/冯达庵《禅宗明心见性与密宗即身成佛》.txt'
      }
    ]
  },
  {
    id: 'chan-hai-ta-deng',
    title: '禅海塔灯题句',
    fullName: '《禅海塔灯题句》',
    translator: '冯达庵',
    cover: '🏮',
    description: '冯达庵居士禅宗诗偈',
    wordCount: 6000,
    chapters: [
      {
        title: '全文',
        url: '/sutras/冯达庵《禅海塔灯题句》.txt'
      }
    ]
  },
  {
    id: 'fa-hua-te-lun',
    title: '法华特论',
    fullName: '《法华特论》',
    translator: '冯达庵',
    cover: '🪷',
    description: '冯达庵居士对法华经的独特阐释',
    wordCount: 12000,
    chapters: [
      {
        title: '全文',
        url: '/sutras/冯达庵《法华特论》.txt'
      }
    ]
  },
  {
    id: 'xin-jing-guang-yi',
    title: '心经广义',
    fullName: '《心经广义》',
    translator: '冯达庵',
    cover: '📕',
    description: '冯达庵居士对心经的深入阐释',
    wordCount: 20000,
    chapters: [
      {
        title: '全文',
        url: '/sutras/冯达庵《心经广义》.txt'
      }
    ]
  },
  {
    id: 'fo-fa-yao-lun',
    title: '佛法要论',
    fullName: '《佛法要论》',
    translator: '冯达庵',
    cover: '📚',
    description: '冯达庵居士对佛法的系统论述',
    wordCount: 25000,
    chapters: [
      {
        title: '全文',
        url: '/sutras/冯达庵《佛法要论》.txt'
      }
    ]
  },
  {
    id: 'tian-yan-tong-yuan-li',
    title: '天眼通原理',
    fullName: '《天眼通原理》',
    translator: '冯达庵',
    cover: '👁️',
    description: '冯达庵居士阐释天眼通原理',
    wordCount: 7000,
    chapters: [
      {
        title: '全文',
        url: '/sutras/冯达庵《天眼通原理》.txt'
      }
    ]
  },
  {
    id: 'xin-dai-de-shi',
    title: '新时代的佛法',
    fullName: '《新时代的佛法》',
    translator: '冯达庵',
    cover: '🌅',
    description: '冯达庵居士探讨佛法在新时代的意义',
    wordCount: 9000,
    chapters: [
      {
        title: '全文',
        url: '/sutras/冯达庵《新时代的佛法》.txt'
      }
    ]
  },
  {
    id: 'tan-gong-shi-ta-gong',
    title: '法门寺塔地宫唐密曼荼罗',
    fullName: '《法门寺塔地宫的唐密曼荼罗之我见》',
    translator: '唐普式',
    cover: '🏛️',
    description: '唐普式对法门寺地宫出土圣物的研究',
    wordCount: 8000,
    chapters: [
      {
        title: '全文',
        url: '/sutras/唐普式《法门寺塔地宫的唐密曼荼罗之我见》.txt'
      }
    ]
  },
  {
    id: 'qi-jue-zhi-song',
    title: '七觉支颂',
    fullName: '《七觉支颂》',
    translator: '唐普式',
    cover: '🌿',
    description: '唐普式对七觉支的阐释',
    wordCount: 4000,
    chapters: [
      {
        title: '全文',
        url: '/sutras/唐普式《七觉支颂》.txt'
      }
    ]
  },
  {
    id: 'liu-da-yuan-qi',
    title: '论著六大缘起',
    fullName: '《论著六大缘起》',
    translator: '唐普式',
    cover: '☯️',
    description: '唐普式对密宗六大缘起的论述',
    wordCount: 10000,
    chapters: [
      {
        title: '全文',
        url: '/sutras/唐普式《论著六大缘起》.txt'
      }
    ]
  },
  {
    id: 'tang-mi-yu-guang-dong',
    title: '唐密与广东',
    fullName: '《唐密与广东》',
    translator: '唐普式',
    cover: '🌊',
    description: '唐普式阐述唐密在广东的传承',
    wordCount: 11000,
    chapters: [
      {
        title: '全文',
        url: '/sutras/唐普式《唐密与广东》.txt'
      }
    ]
  },
  {
    id: 'yin-du-mi-jiao',
    title: '印度密教管窥',
    fullName: '《印度密教管窥》',
    translator: '唐普式',
    cover: '🕉️',
    description: '唐普式对印度密教的研究',
    wordCount: 13000,
    chapters: [
      {
        title: '全文',
        url: '/sutras/唐普式《印度密教管窥》.txt'
      }
    ]
  },
  {
    id: 'zong-men-san-guan',
    title: '宗门三关直指',
    fullName: '《宗门三关直指》',
    translator: '唐普式',
    cover: '🎯',
    description: '唐普式对禅宗三关的指点',
    wordCount: 7000,
    chapters: [
      {
        title: '全文',
        url: '/sutras/唐普式《宗门三关直指》.txt'
      }
    ]
  }
]


/**
 * 也可以加载远程经文 (从其他服务器)
 */
export const remoteSutras = [
  {
    id: 'guan-yin-jing-remote',
    title: '观音经',
    fullName: '《妙法莲华经观世音菩萨普门品》',
    translator: '姚秦三藏法师鸠摩罗什译',
    cover: '🌺',
    description: '讲述观世音菩萨慈悲救度众生的经典',
    wordCount: 3000,
    chapters: [
      {
        title: '全文',
        // 使用远程 URL
        url: 'https://example.com/sutras/guan-yin-jing.txt'
      }
    ]
  }
]
