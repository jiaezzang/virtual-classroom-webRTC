import { streamingConfigAtom } from '@/atoms';
import useSignaling, { RTCEvent } from '@/hooks/useSignaling';
import { useAtomValue } from 'jotai';
import { useEffect, useRef, useState } from 'react';
import { useSelfieSegmentation } from '@/hooks/useSelfieSegmentation';
import bgYuchae from '@/assets/images/bg/bg_yuchae.jpg';
import bgSpring from '@/assets/images/bg/bg_spring.jpg';
import bgSky from '@/assets/images/bg/bg_sky.jpg';
import bgNight from '@/assets/images/bg/bg_night.jpg';

export default function ClassRoom() {
    const userType = sessionStorage.getItem('type') as TUser;
    const [stream, setStream] = useState<MediaStream>();
    const [rtcPeer, setRtcPeer] = useState<RTCPeerConnection>();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { connectState } = useSignaling(rtcPeer);
    const streamingConfig = useAtomValue(streamingConfigAtom);
    const [local, setLocal] = useState<HTMLVideoElement | undefined>(undefined);
    const [remote, setRemote] = useState<HTMLVideoElement | undefined>(undefined);
    const { updateVideo } = useSelfieSegmentation({ canvasRef });
    const [background, setBackground] = useState<string | null>(null);

    /** 배경을 변경한다 */
    const onChangeBg = () => {
        const bg = [bgYuchae, bgSpring, bgSky, bgNight, null];
        const currentIndex = bg.indexOf(background);
        const nextIndex = currentIndex === bg.length - 1 ? 0 : currentIndex + 1;
        setBackground(bg[nextIndex]);
    };

    const connectPeer = (stream: MediaStream) => {
        const config: RTCConfiguration = {
            iceServers: [
                {
                    urls: import.meta.env.VITE_APP_RTC_STUN ?? 'stun:stun.l.google.com:19302'
                }
            ]
        };
        const rtcPeer = new RTCPeerConnection(config);
        stream.getTracks().forEach((track) => rtcPeer.addTrack(track, stream));
        rtcPeer.ontrack = (e) => {
            const remoteVideoEl = document.createElement('video');
            remoteVideoEl.srcObject = e.streams[0];
            remoteVideoEl.autoplay = true;
            remoteVideoEl.play().catch((error) => {
                console.error(error);
            });
            setRemote(remoteVideoEl);
        };
        setRtcPeer(rtcPeer);
    };

    /** Local Video */
    useEffect(() => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
        navigator.mediaDevices?.getUserMedia({ video: true, audio: true }).then(setStream);
    }, []);

    useEffect(() => {
        if (!stream) return;
        const localVideoEl = document.createElement('video');
        localVideoEl.srcObject = stream;
        localVideoEl.autoplay = true;
        localVideoEl.play().catch((error) => {
            console.error(error);
        });
        localVideoEl.onloadeddata = () => setLocal(localVideoEl);
    }, [stream]);

    /** Remote Video */
    useEffect(() => {
        if (import.meta.env.DEV && connectState === 'connected') return;
        if (!stream) return;
        console.log('connected');
        connectPeer(stream);
    }, [stream]);

    /**카메라, 영상 송출 관련 */
    useEffect(() => {
        if (!stream) return;
        stream.getVideoTracks().forEach((track) => {
            track.enabled = streamingConfig.video;
        });
        stream.getAudioTracks().forEach((track) => {
            track.enabled = streamingConfig.audio;
        });

        const _data = { type: 'video-config', config: streamingConfig };
        RTCEvent.emit('send', JSON.stringify(_data));
    }, [streamingConfig]);

    /** RTCEvent 수신 Emit 등록 */
    useEffect(() => {
        const receiveData = (data: string): void => {
            const parsedData = JSON.parse(data);

            if (parsedData.type === 'video-config' || parsedData.type === 'posture-effect') {
                return;
            }
        };

        RTCEvent.on('receive', receiveData);
        return () => {
            RTCEvent.off('receive', receiveData);
        };
    }, []);

    useEffect(() => {
        if (!local && !remote) return;
        updateVideo({ localVideo: local, remoteVideo: remote, src: background });
    }, [local, remote, background, updateVideo]);

    return (
        <div className={`flex justify-center w-screen h-screen bg-gradient-to-r bg-blue-100`}>
            <div className="flex flex-col items-center gap-3 pt-2">
                <label className="bg-[red] w-[100px] h-[35px] rounded-3xl pt-1 text-blue-100 text-center font-extrabold">{userType.toUpperCase()}</label>
                <canvas
                    ref={canvasRef}
                    className="relative flex items-center justify-center pt-3 overflow-hidden w-full h-full min-w-[1240px] max-w-[1440px] object-cover"
                ></canvas>
                <button className="absolute bg-[black] rounded-3xl w-[190px] h-[50px] bottom-5 text-blue-100 text-center font-extrabold" onClick={onChangeBg}>
                    Change Background
                </button>
            </div>
        </div>
    );
}
