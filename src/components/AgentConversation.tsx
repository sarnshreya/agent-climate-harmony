import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';

interface AgentOutput {
  agent: string;
  icon: string;
  title: string;
  content: string[];
  receivedFrom?: string[];
  sentTo?: string[];
}

interface AgentConversationProps {
  outputs: AgentOutput[];
}

export const AgentConversation = ({ outputs }: AgentConversationProps) => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">Agent Conversation Flow</h2>
        <p className="text-muted-foreground">
          Follow the reasoning and data flow between agents as they process the document
        </p>
      </div>

      <ScrollArea className="h-[800px] pr-4">
        <div className="space-y-4">
          {outputs.map((output, index) => (
            <Card key={index} className="border-l-4" style={{ borderLeftColor: 'hsl(var(--primary))' }}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">{output.icon}</span>
                    <span>{output.agent}</span>
                  </CardTitle>
                  <Badge className="bg-primary text-primary-foreground">{output.title}</Badge>
                </div>
                {output.receivedFrom && output.receivedFrom.length > 0 && (
                  <div className="flex gap-2 items-center text-sm text-muted-foreground mt-2">
                    <span>← Received from:</span>
                    {output.receivedFrom.map((agent, i) => (
                      <Badge key={i} className="text-xs bg-primary/10 text-primary border-primary/20">
                        {agent}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {output.content.map((section, i) => (
                  <div key={i}>
                    <p className="text-sm text-foreground whitespace-pre-line">{section}</p>
                    {i < output.content.length - 1 && <Separator className="my-2" />}
                  </div>
                ))}
                {output.sentTo && output.sentTo.length > 0 && (
                  <div className="flex gap-2 items-center text-sm text-muted-foreground mt-4 pt-4 border-t">
                    <span>→ Sent to:</span>
                    {output.sentTo.map((agent, i) => (
                      <Badge key={i} className="text-xs bg-primary/10 text-primary border-primary/20">
                        {agent}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
