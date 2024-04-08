import { streamingConfigAtom } from '@/atoms';
import useSignaling, { RTCEvent } from '@/hooks/useSignaling';
import { useAtomValue } from 'jotai';
import { useEffect, useRef, useState } from 'react';
import sunflower from '../../assets/images/bg/bg_sunflower.jpg';
import Canvas from './Canvas';
import { drawStreamToCanvas } from '@/utils/utils';

export default function ClassRoom() {
    const userType = sessionStorage.getItem('type') as TUser;
    const [stream, setStream] = useState<MediaStream>();
    const [rtcPeer, setRtcPeer] = useState<RTCPeerConnection>();
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const localCanvasRef = useRef<HTMLCanvasElement>(null);
    const remoteCanvasRef = useRef<HTMLCanvasElement>(null);
    const { connectState } = useSignaling(rtcPeer);
    const streamingConfig = useAtomValue(streamingConfigAtom);

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
            if (!remoteVideoRef.current) return;
            remoteVideoRef.current.srcObject = e.streams[0];
            remoteVideoRef.current.play().catch((error) => {
                console.error(error);
            });
        };
        setRtcPeer(rtcPeer);
    };

    /** Local Video */
    useEffect(() => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
        navigator.mediaDevices?.getUserMedia({ video: true, audio: true }).then(setStream);
    }, []);

    useEffect(() => {
        if (!localVideoRef.current || !stream) return;
        localVideoRef.current.srcObject = stream;
    }, [stream]);

    /** Remote Video */
    useEffect(() => {
        if (import.meta.env.DEV && connectState === 'connected') return;
        if (!stream) return;
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
        if (stream) drawStreamToCanvas({ stream, canvasRef: localCanvasRef });
    }, [stream, localCanvasRef]);

    return (
        <div className={`flex justify-center w-screen h-screen bg-gradient-to-r bg-blue-100`}>
            <div className="flex flex-col items-center gap-3 pt-2">
                <label className="bg-[red] w-[100px] h-[35px] text-blue-100 pt-1 text-center rounded-3xl font-extrabold">{userType.toUpperCase()}</label>
                <div
                    className={`top-container relative flex items-center justify-center pt-3 overflow-hidden w-full h-full min-w-[1240px] max-w-[1440px]`}
                    style={{ backgroundImage: `url(${sunflower})`, width: '100%', backgroundSize: 'cover', backgroundPosition: 'center' }}
                >
                    {userType === 'teacher' ? (
                        <>
                            {<Canvas canvasRef={remoteCanvasRef} />}
                            <Canvas canvasRef={localCanvasRef} />
                        </>
                    ) : (
                        <>
                            <Canvas canvasRef={localCanvasRef} />
                            {<Canvas canvasRef={remoteCanvasRef} />}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
