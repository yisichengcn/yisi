/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum GameState {
  START = 'START',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAMEOVER = 'GAMEOVER',
}

export enum EnemyType {
  BASIC = 'BASIC',
  FAST = 'FAST',
  HEAVY = 'HEAVY',
}

export enum PowerUpType {
  TRIPLE_SHOT = 'TRIPLE_SHOT',
  SHIELD = 'SHIELD',
  HEAL = 'HEAL',
}

export enum ElementType {
  WATER = 'WATER',
  FIRE = 'FIRE',
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_blood', title: '第一滴血', description: '击毁第一架敌机', unlocked: false },
  { id: 'survivor', title: '生存者', description: '达到第 3 关', unlocked: false },
  { id: 'ace', title: '王牌飞行员', description: '累计击毁 50 架敌机', unlocked: false },
  { id: 'untouchable', title: '毫发无伤', description: '在不受到伤害的情况下达到第 2 关', unlocked: false },
  { id: 'power_hungry', title: '能量狂人', description: '收集 5 个道具', unlocked: false },
];

export const GAME_CONSTANTS = {
  PLAYER_SPEED: 5,
  BULLET_SPEED: 7,
  ENEMY_SPAWN_RATE: 1500, // ms
  POWERUP_SPAWN_RATE: 10000, // ms
  INVINCIBILITY_DURATION: 2000, // ms
  LEVEL_UP_SCORE: 1000,
};
