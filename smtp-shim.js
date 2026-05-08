#!/usr/bin/env node

const net = require('net');

const PORT = 1025;

const server = net.createServer((socket) => {
  console.log('[SMTP] Connection established');

  // Send greeting
  socket.write('220 SMTP-Shim ESMTP Service Ready\r\n');

  let from = '';
  let to = [];
  let dataMode = false;
  let emailData = '';

  socket.on('data', (data) => {
    const lines = data.toString().split('\r\n');

    for (const line of lines) {
      if (dataMode) {
        if (line === '.') {
          dataMode = false;
          console.log('[SMTP] --- EMAIL DATA ---');
          console.log(emailData);
          console.log('[SMTP] --- END EMAIL ---');
          console.log('[SMTP] === END EMAIL ===\n');
          socket.write('250 OK: message accepted for delivery\r\n');
          emailData = '';
        } else {
          emailData += line + '\n';
        }
        continue;
      }

      const upper = line.toUpperCase();

      if (upper.startsWith('HELO') || upper.startsWith('EHLO')) {
        socket.write('250 Hello ' + line.split(' ')[1] + '\r\n');
      } else if (upper.startsWith('MAIL FROM:')) {
        from = line.match(/<(.+)>/)?.[1] || '';
        console.log('[SMTP] === EMAIL RECEIVED ===');
        console.log(`[SMTP] From: ${from}`);
        socket.write('250 OK\r\n');
      } else if (upper.startsWith('RCPT TO:')) {
        const recipient = line.match(/<(.+)>/)?.[1] || '';
        to.push(recipient);
        console.log(`[SMTP] To: ${recipient}`);
        socket.write('250 OK\r\n');
      } else if (upper === 'DATA') {
        dataMode = true;
        socket.write('354 Start mail input; end with <CRLF>.<CRLF>\r\n');
      } else if (upper === 'QUIT') {
        socket.write('221 Bye\r\n');
        socket.end();
      } else if (upper === 'RSET') {
        from = '';
        to = [];
        emailData = '';
        socket.write('250 OK\r\n');
      } else if (upper.startsWith('NOOP')) {
        socket.write('250 OK\r\n');
      } else if (upper.startsWith('VRFY')) {
        socket.write('252 Cannot VRFY user\r\n');
      } else {
        socket.write('250 OK\r\n');
      }
    }
  });

  socket.on('end', () => {
    console.log('[SMTP] Connection closed');
  });

  socket.on('error', (err) => {
    console.error('[SMTP] Socket error:', err.message);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[SMTP] Shim server listening on port ${PORT}`);
});

server.on('error', (err) => {
  console.error('[SMTP] Server error:', err.message);
  process.exit(1);
});
