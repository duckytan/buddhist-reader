/**
 * 动态经文配置
 * 经文 TXT 文件应放在 public/sutras/ 目录下
 * 例如: public/sutras/xin-jing.txt
 */

export const dynamicSutras = [
  {
    id: 'xin-jing',
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
    id: 'di-zang-jing',
    title: '地藏经',
    fullName: '《地藏菩萨本愿经》',
    translator: '唐于阗国三藏沙门实叉难陀译',
    cover: '🌸',
    description: '讲述地藏菩萨发愿救度众生的经典，共13品',
    wordCount: 28000,
    chapters: [
      {
        title: '第一品：忉利天宫神通品第一',
        url: '/sutras/di-zang-jing-chapter1.txt'
      },
      {
        title: '第二品：分身集会品第二',
        url: '/sutras/di-zang-jing-chapter2.txt'
      }
      // 可以继续添加更多章节
    ]
  },
  {
    id: 'a-mi-tuo-jing',
    title: '阿弥陀经',
    fullName: '《佛说阿弥陀经》',
    translator: '姚秦龟兹三藏鸠摩罗什译',
    cover: '🙏',
    description: '净土宗核心经典，介绍西方极乐世界和阿弥陀佛',
    wordCount: 1800,
    chapters: [
      {
        title: '全文',
        url: '/sutras/a-mi-tuo-jing.txt'
      }
    ]
  },
  {
    id: 'jin-gang-jing',
    title: '金刚经',
    fullName: '《金刚般若波罗蜜经》',
    translator: '姚秦三藏法师鸠摩罗什译',
    cover: '💎',
    description: '大乘般若部经典，共32分，讲述空性智慧',
    wordCount: 5200,
    chapters: [
      {
        title: '第一品：法会因由分',
        url: '/sutras/jin-gang-jing-chapter1.txt'
      },
      {
        title: '第二品：善现启请分',
        url: '/sutras/jin-gang-jing-chapter2.txt'
      }
      // 可以继续添加更多章节
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
