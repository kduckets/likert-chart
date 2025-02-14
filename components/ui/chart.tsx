import React from "react"
import cn from "classnames"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

type ChartConfig = {
  [key: string]: {
    theme?: string
    color?: string
  }
}

const ChartStyle = ({ id, config }: { id: string; config?: ChartConfig }) => {
  if (!config) {
    console.warn("Chart config is undefined. Using default configuration.")
    return null
  }

  const colorConfig = Object.entries(config).filter(([_, conf]) => conf && (conf.theme || conf.color))

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
          #${id} {
            --chart-color-sequence: ${colorConfig.map(([_, conf]) => conf.color || `var(--${conf.theme})`).join(", ")};
          }
          ${colorConfig
            .map(
              ([key, conf]) => `
            #${id} {
              --color-${key}: ${conf.color || `var(--${conf.theme})`};
            }
          `,
            )
            .join("\n")}
        `,
      }}
    />
  )
}

export const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    config?: ChartConfig
  }
>(({ children, config, className, ...props }, ref) => {
  const id = React.useId()

  return (
    <div ref={ref} id={id} className={cn("text-sm", className)} {...props}>
      <ChartStyle id={id} config={config} />
      {children}
    </div>
  )
})
ChartContainer.displayName = "ChartContainer"

export const ChartTooltip = ({ content }: { content: React.ReactNode }) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-pointer" />
        </TooltipTrigger>
        <TooltipContent>{content}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

