import {
  SubscribeMessage,
  WebSocketGateway,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Socket, Server } from 'socket.io';

interface ChatMessage {
  sender: string;
  text: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private logger: Logger = new Logger('ChatGateway');

  afterInit(server: Server) {
    this.logger.log(`Websocket initialized ${!!server}`);
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('send_message')
  handleMessage(
    @MessageBody() data: ChatMessage,
    @ConnectedSocket() client: Socket,
  ): void {
    client.broadcast.emit('receive_message', data);
    client.broadcast.emit('notification', {
      text: `New message from ${data.sender}`,
    });
  }
}
