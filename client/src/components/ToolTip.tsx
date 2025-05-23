import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip"

export default function ToolTip({children, content}: {children: React.ReactNode, content: string}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
            {children}
        </TooltipTrigger>
        <TooltipContent className="bg-secondary text-secondary-content">
          <p className="font-semibold">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
