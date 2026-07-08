import { NextResponse } from 'next/server';

export async function POST(request) {
  const body = await request.json();
  const messages = body.messages || [];
  const lastMessage = messages[messages.length - 1]?.content || "";

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendChunk = (text) => {
        controller.enqueue(encoder.encode(`data: {"delta":${JSON.stringify(text)}}\n\n`));
      };

      // 약간의 지연 후 응답 시작
      await new Promise(r => setTimeout(r, 600));

      const mockResponse = `알겠습니다. 요청하신 **"${lastMessage}"**에 대한 수정을 진행하겠습니다. \n\n이 내용을 문서에 바로 적용해 드릴까요?`;
      
      // 글자 단위로 스트리밍 (타이핑 효과)
      for (let i = 0; i < mockResponse.length; i++) {
        sendChunk(mockResponse[i]);
        await new Promise(r => setTimeout(r, 30));
      }

      await new Promise(r => setTimeout(r, 200));
      controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}
