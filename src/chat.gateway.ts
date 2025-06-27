import {
  WebSocketGateway,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Socket, Server } from 'socket.io';

interface ChatMessage {
  sender: string;
  text: string;
}

interface User {
  socketId: string;
  username: string;
}

@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private logger = new Logger('ChatGateway');
  private users: User[] = [];

  afterInit(server: Server) {
    this.logger.log(`Websocket initialized ${!!server}`);
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const user = this.users.find((u) => u.socketId === client.id);
    if (user) {
      this.users = this.users.filter((u) => u.socketId !== client.id);
      client.broadcast.emit('user_left', user.username);
      client.broadcast.emit(
        'online_users',
        this.users.map((u) => u.username),
      );
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join')
  handleJoin(
    @MessageBody() username: string,
    @ConnectedSocket() client: Socket,
  ) {
    this.users.push({ socketId: client.id, username });
    client.broadcast.emit('user_joined', username);
    client.broadcast.emit(
      'online_users',
      this.users.map((u) => u.username),
    );
    client.emit(
      'online_users',
      this.users.map((u) => u.username),
    ); // send back to self
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

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() username: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.broadcast.emit('user_typing', username);
  }

  @SubscribeMessage('stop_typing')
  handleStopTyping(
    @MessageBody() username: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.broadcast.emit('user_stop_typing', username);
  }
}
