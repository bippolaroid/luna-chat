interface UserIconIF {
  type?: string;
}

export function UserIcon(props: UserIconIF) {
  switch (props.type) {
    default:
        return "User Icon Error"
    case "user":
      return "👤";
    case "assistant":
      return "🌔";
  }
}
