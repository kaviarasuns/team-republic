import type { SourceRef } from "@team-republic/contracts";
import * as Linking from "expo-linking";
import { Pressable, Text, type TextProps } from "react-native";

export const sourceAccessibilityHint = (source: SourceRef): string => {
  const parts = [source.title];
  if (source.sheet) {
    parts.push(source.sheet);
  }
  if (source.row != null) {
    parts.push(String(source.row));
  }
  return parts.join(" · ");
};

type SourceLinkProps = {
  readonly source: SourceRef;
  readonly children: string;
  readonly className?: string;
  readonly accessibilityLabel: string;
} & Pick<TextProps, "numberOfLines">;

export const SourceLink = ({
  source,
  children,
  className,
  accessibilityLabel,
  numberOfLines,
}: SourceLinkProps) => (
  <Pressable
    accessibilityRole="link"
    accessibilityLabel={accessibilityLabel}
    accessibilityHint={sourceAccessibilityHint(source)}
    className="min-h-11 justify-center active:opacity-70"
    onPress={() => {
      void Linking.openURL(source.url);
    }}
  >
    <Text className={className} numberOfLines={numberOfLines}>
      {children}
    </Text>
  </Pressable>
);
