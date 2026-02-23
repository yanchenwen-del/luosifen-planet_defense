export enum GameStatus {
  START = 'START',
  PLAYING = 'PLAYING',
  WON = 'WON',
  LOST = 'LOST',
}

export interface Point {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  pos: Point;
}

export interface Rocket extends Entity {
  start: Point;
  target: Point;
  speed: number;
  progress: number; // 0 to 1
}

export interface Missile extends Entity {
  start: Point;
  target: Point;
  speed: number;
  progress: number; // 0 to 1
}

export interface Explosion extends Entity {
  radius: number;
  maxRadius: number;
  expanding: boolean;
  life: number; // 0 to 1
}

export interface City extends Entity {
  active: boolean;
  destroyedAt?: number;
}

export interface Battery extends Entity {
  active: boolean;
  missiles: number;
  destroyedAt?: number;
}

export interface GameState {
  status: GameStatus;
  score: number;
  level: number;
  rockets: Rocket[];
  missiles: Missile[];
  explosions: Explosion[];
  cities: City[];
  batteries: Battery[];
  language: 'zh' | 'en';
}
