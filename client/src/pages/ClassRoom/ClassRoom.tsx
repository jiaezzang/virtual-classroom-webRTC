import { streamingConfigAtom } from '@/atoms';
import useSignaling, { RTCEvent } from '@/hooks/useSignaling';
// import useVirtualBackground from '@/hooks/useVirtualBackground';
import { useAtomValue } from 'jotai';
import { useEffect, useRef, useState } from 'react';

export default function ClassRoom() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream>();
    const [rtcPeer, setRtcPeer] = useState<RTCPeerConnection>();
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const { connectState } = useSignaling(rtcPeer);
    const streamingConfig = useAtomValue(streamingConfigAtom);
    // useVirtualBackground({ canvasRef });

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

    return (
        <div className={`flex justify-center w-screen h-screen bg-gradient-to-r bg-red-100`}>
            <div className="top-container flex flex-col items-center justify-center pt-3 overflow-hidden w-full h-full min-w-[1240px] max-w-[1440px] rounded-xl border border-[white] bg-white">
                <canvas ref={canvasRef} className="top-0 left-0 w-full h-full rounded-3xl object-cover"></canvas>
            </div>
        </div>
    );
}
