export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

export const ROCKET_SPEED_BASE = 0.00011;
export const MISSILE_SPEED = 0.015;
export const EXPLOSION_MAX_RADIUS = 40;
export const EXPLOSION_SPEED = 0.05;

export const WIN_SCORE = 1000;
export const INITIAL_MISSILES = 100;

export const TRANSLATIONS = {
  zh: {
    title: 'luosifen 新星防御',
    start: '开始游戏',
    win: '恭喜！你成功保卫了新星！',
    loss: '防线崩溃，城市已陷落。',
    restart: '再玩一次',
    score: '得分',
    missiles: '弹药',
    target: '目标得分',
    howToPlay: '点击屏幕发射拦截导弹。预判火箭路径，利用爆炸范围摧毁敌人。',
  },
  en: {
    title: 'luosifen Nova Defense',
    start: 'Start Game',
    win: 'Success! You defended the Nova!',
    loss: 'Defense collapsed. The cities have fallen.',
    restart: 'Play Again',
    score: 'Score',
    missiles: 'Missiles',
    target: 'Target Score',
    howToPlay: 'Click anywhere to fire interceptor missiles. Predict rocket paths and use explosions to destroy enemies.',
  }
};
