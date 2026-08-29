# Automação Planilhas — Windows Portable

Interface Windows para o motor WhatsApp → Google Planilhas.

## v1.0.0

- Interface gráfica com status do motor, WhatsApp e planilha.
- Botões Iniciar e Parar.
- Log em tempo real.
- Configuração dos IDs dos grupos.
- URL do Apps Script e aba configuráveis.
- Diagnóstico de grupos ativável/desativável.
- Mantém as regras atuais de notícias, vídeos, análise e assunto.
- Detecta Google Chrome ou Microsoft Edge instalado.
- Também aceita `chrome\chrome.exe` ao lado do executável.

## Uso

1. Baixe o `.exe` da Release.
2. Abra o programa.
3. Confira URL, aba e grupos.
4. Clique em **INICIAR**.
5. Na primeira execução, a janela do navegador abrirá para autenticação do WhatsApp.
6. Depois da autenticação, a sessão é preservada pelo LocalAuth.

## Build

O GitHub Actions gera o Windows Portable. Uma tag `v1.0.0` publica automaticamente a Release.

> Usa WhatsApp Web por meio de `whatsapp-web.js`; mudanças no WhatsApp Web podem exigir atualização futura.
