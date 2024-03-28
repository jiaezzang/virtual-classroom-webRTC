import EventEmitter3 from 'eventemitter3';
import { useEffect, useRef, useState } from 'react';

type TSignalData =
    | {
          type: 'newStream';
          data: { stream: boolean };
      }
    | { type: 'sdp'; data: RTCSessionDescriptionInit }
    | { type: 'iceCandidate'; data: RTCIceCandidate }
    | { type: 'ready' };

type TReceive = 'receive' | 'receive:open' | 'receive:close' | 'receive:error';
type TSend = 'send' | 'send:open' | 'send:close' | 'send:error';
type TGesture = 'gesture';

type TEventNames = TReceive | TSend | TGesture | 'open';

export const RTCEvent = new EventEmitter3<TEventNames>();

export default function useSignaling(peerConnection?: RTCPeerConnection) {
    const [connectState, setConnectState] = useState<RTCPeerConnectionState>('connecting');
    const dataChannel = useRef<RTCDataChannel>();
    const ws = useRef<WebSocket>();

    useEffect(() => {
        if (import.meta.env.DEV && connectState === 'connected') return;

        if (!peerConnection) return;
        console.log('OPEN RTC!!');
        //localhost 자리에 server IP 입력하기
        ws.current = new WebSocket('ws://localhost:3000');
        ws.current.addEventListener('open', () => {
            // 시그널링 서버에 로컬 스트림 정보 전송
            sendSignal({ type: 'newStream', data: { stream: true } });
            // 시그널링 서버로부터 메시지 수신
            ws.current?.addEventListener('message', (event) => {
                const data: TSignalData = JSON.parse(event.data);
                if (data.type === 'newStream') {
                    // 원격 피어로부터의 새로운 스트림을 처리
                    handleNewStream(data.data);
                } else {
                    // 기타 시그널링 메시지 처리
                    handleSignalingData(data);
                }
            });
        });
        // Send
        dataChannel.current = peerConnection.createDataChannel('jiaezzang');
        dataChannel.current.addEventListener('open', () => {
            RTCEvent.emit('send:open');
        });
        dataChannel.current.addEventListener('close', () => {
            RTCEvent.emit('send:close');
        });
        dataChannel.current.addEventListener('error', () => {
            RTCEvent.emit('send:error');
        });
        RTCEvent.on('send', (data: string) => dataChannel.current?.send(data));

        // Receive
        peerConnection.addEventListener('datachannel', (e) => {
            const channel = e.channel;
            channel.addEventListener('message', (e) => {
                RTCEvent.emit('receive', e.data);
            });
            channel.addEventListener('close', () => {
                RTCEvent.emit('receive:close');
            });
            channel.addEventListener('error', () => {
                RTCEvent.emit('receive:error');
            });
        });

        // 원격 피어로부터의 ICE candidate 수신
        peerConnection.addEventListener('connectionstatechange', () => {
            setConnectState(peerConnection.connectionState);
        });
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                sendSignal({ type: 'iceCandidate', data: event.candidate });
            }
        };

        function sendSignal(data: TSignalData) {
            if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                // 이미 연결된 웹 소켓이 열려 있으면 메시지 전송
                ws.current.send(JSON.stringify(data));
            } else {
                console.error('WebSocket connection is not open.');
            }
        }
        function handleNewStream(data: { stream: boolean }) {
            // 원격 피어로부터의 새로운 스트림을 처리
            const { stream } = data;
            if (stream) {
                // Offer SDP 생성
                peerConnection
                    ?.createOffer()
                    .then((offer) => peerConnection.setLocalDescription(offer))
                    .then(() =>
                        sendSignal({
                            type: 'sdp',
                            data: peerConnection.localDescription!
                        })
                    )
                    .catch((error) => console.error('Error creating offer:', error));
            }
        }

        function handleSignalingData(data: TSignalData) {
            // 기타 시그널링 데이터를 처리
            if (data.type === 'sdp') {
                peerConnection
                    ?.setRemoteDescription(new RTCSessionDescription(data.data))
                    .then(() => {
                        if (data.data.type === 'offer') {
                            return peerConnection.createAnswer();
                        }
                    })
                    .then((answer) => {
                        if (answer) {
                            peerConnection.setLocalDescription(answer);
                            sendSignal({ type: 'sdp', data: answer });
                        }
                    })
                    .catch((error) => {
                        console.error('Error handling SDP:', error);
                    });
            } else if (data.type === 'iceCandidate') {
                peerConnection?.addIceCandidate(new RTCIceCandidate(data.data)).catch((error) => {
                    console.error('Error handling ICE candidate:', error);
                });
            }
        }
    }, [peerConnection]);

    /** 시그널링 연결 끊기 */
    useEffect(() => {
        if (connectState === 'connected') ws.current?.close();
    }, [connectState]);

    return { connectState };
}
