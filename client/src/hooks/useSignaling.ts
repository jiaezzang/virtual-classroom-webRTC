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
type TEventNames = TReceive | TSend | 'open';

export const RTCEvent = new EventEmitter3<TEventNames>();

export default function useSignaling(peerConnection?: RTCPeerConnection) {
    const [connectState, setConnectState] = useState<RTCPeerConnectionState>('connecting');
    const dataChannel = useRef<RTCDataChannel>();
    const ws = useRef<WebSocket>();
    const userType: TUser = sessionStorage.getItem('type') as TUser;

    useEffect(() => {
        if (!peerConnection) return;

        console.log('Initializing WebSocket connection...');
        ws.current = new WebSocket('ws://localhost:3000');

        ws.current.addEventListener('open', () => {
            console.log('WebSocket connection established.');
            sendSignal({ type: 'newStream', data: { stream: true } });
        });

        ws.current.addEventListener('message', (event) => {
            const data: TSignalData = JSON.parse(event.data);
            console.log('Received signaling data:', data);

            if (data.type === 'sdp' && userType !== 'teacher') {
                handleOffer(data);
            } else {
                handleSignalingData(data);
            }
        });

        ws.current.addEventListener('close', () => console.log('WebSocket connection closed.'));
        ws.current.addEventListener('error', (error) => console.error('WebSocket error:', error));

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
                console.log('ws Open!!', data);
            } else {
                console.error('WebSocket connection is not open.');
            }
        }

        const handleOffer = (data: TSignalData) => {
            console.log('Handling offer...');
            if (data.type === 'ready') return;
            peerConnection
                ?.setRemoteDescription(new RTCSessionDescription(data.data as RTCSessionDescriptionInit))
                .then(() => peerConnection.createAnswer())
                .then((answer) => peerConnection.setLocalDescription(answer))
                .then(() => sendSignal({ type: 'sdp', data: peerConnection.localDescription as RTCSessionDescription }))
                .catch((error) => console.error('Error handling offer:', error));
        };

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
        return () => {
            console.log('Closing WebSocket connection...');
            ws.current?.close();
        };
    }, [peerConnection, userType]);

    return { connectState };
}
