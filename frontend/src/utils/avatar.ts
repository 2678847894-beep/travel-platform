/** 小动物头像系统 - 根据用户 ID 确定性分配默认动物头像 */

export interface AnimalAvatar {
  emoji: string
  name: string
  bg: string
  color: string
}

export const ANIMAL_AVATARS: AnimalAvatar[] = [
  { emoji: '🐱', name: '猫咪', bg: 'linear-gradient(135deg, #FFE0B2, #FFB74D)', color: '#E65100' },
  { emoji: '🐶', name: '小狗', bg: 'linear-gradient(135deg, #C8E6C9, #81C784)', color: '#1B5E20' },
  { emoji: '🐼', name: '熊猫', bg: 'linear-gradient(135deg, #F5F5F5, #BDBDBD)', color: '#424242' },
  { emoji: '🐨', name: '考拉', bg: 'linear-gradient(135deg, #D7CCC8, #A1887F)', color: '#3E2723' },
  { emoji: '🐰', name: '兔子', bg: 'linear-gradient(135deg, #F8BBD0, #F48FB1)', color: '#880E4F' },
  { emoji: '🦊', name: '狐狸', bg: 'linear-gradient(135deg, #FFE0B2, #FFB74D)', color: '#E65100' },
  { emoji: '🐸', name: '青蛙', bg: 'linear-gradient(135deg, #C8E6C9, #66BB6A)', color: '#1B5E20' },
  { emoji: '🦁', name: '狮子', bg: 'linear-gradient(135deg, #FFF3E0, #FFB74D)', color: '#BF360C' },
  { emoji: '🐯', name: '老虎', bg: 'linear-gradient(135deg, #FFECB3, #FFB74D)', color: '#E65100' },
  { emoji: '🐻', name: '小熊', bg: 'linear-gradient(135deg, #D7CCC8, #8D6E63)', color: '#3E2723' },
  { emoji: '🦄', name: '独角兽', bg: 'linear-gradient(135deg, #E1BEE7, #CE93D8)', color: '#4A148C' },
  { emoji: '🦋', name: '蝴蝶', bg: 'linear-gradient(135deg, #B3E5FC, #4FC3F7)', color: '#01579B' },
  { emoji: '🐧', name: '企鹅', bg: 'linear-gradient(135deg, #BBDEFB, #64B5F6)', color: '#0D47A1' },
  { emoji: '🦉', name: '猫头鹰', bg: 'linear-gradient(135deg, #D7CCC8, #BCAAA4)', color: '#3E2723' },
  { emoji: '🐙', name: '章鱼', bg: 'linear-gradient(135deg, #F8BBD0, #EF9A9A)', color: '#B71C1C' },
  { emoji: '🐢', name: '乌龟', bg: 'linear-gradient(135deg, #C8E6C9, #A5D6A7)', color: '#1B5E20' },
]

/**
 * 根据用户 ID 确定性获取小动物头像。
 * 若用户已在 localStorage 中手动选择过动物，则优先使用该选择。
 */
export function getAnimalAvatar(userId: number): AnimalAvatar {
  const saved = localStorage.getItem('marvis_animal_index')
  if (saved !== null) {
    const idx = parseInt(saved, 10)
    if (idx >= 0 && idx < ANIMAL_AVATARS.length) {
      return ANIMAL_AVATARS[idx]
    }
  }
  return ANIMAL_AVATARS[userId % ANIMAL_AVATARS.length]
}

/**
 * 手动选择小动物并保存到 localStorage。
 */
export function setAnimalAvatar(index: number): void {
  if (index >= 0 && index < ANIMAL_AVATARS.length) {
    localStorage.setItem('marvis_animal_index', String(index))
  }
}

/**
 * 获取当前手动选中的动物索引（用于 Modal 中的选中态高亮）。
 * 未手动选择过则返回 -1。
 */
export function getSelectedAnimalIndex(): number {
  const saved = localStorage.getItem('marvis_animal_index')
  return saved !== null ? parseInt(saved, 10) : -1
}
