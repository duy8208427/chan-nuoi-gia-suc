// Ảnh chuồng dùng chung với bản web (public/pens), cùng bảng mã như POND_IMAGES trong src/geo.ts.
import type { ImageSourcePropType } from "react-native";

const IMG = {
  DN01: require("../../public/pens/dn01.jpg"),
  DN02: require("../../public/pens/dn02.jpg"),
  DN03: require("../../public/pens/dn03.jpg"),
  DN04: require("../../public/pens/dn04.jpg"),
  LD01: require("../../public/pens/ld01.jpg"),
  LD02: require("../../public/pens/ld02.jpg"),
  LD03: require("../../public/pens/ld03.jpg"),
  LD04: require("../../public/pens/ld04.jpg"),
} satisfies Record<string, ImageSourcePropType>;

export function penPhoto(code: string): ImageSourcePropType {
  return IMG[code as keyof typeof IMG] ?? IMG.DN01;
}
