import { atom } from 'jotai';

/** 스트리밍 설정 관련 정의 */
export const streamingConfigAtom = atom<{ [key: string]: boolean }>({
    video: true,
    mic: false
});
