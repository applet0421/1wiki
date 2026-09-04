import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TitleSlugFields } from "./title-slug-fields";

describe("TitleSlugFields", () => {
  it("generates a slug when an AI-generated title is supplied without a slug", () => {
    render(<TitleSlugFields initialTitle="ChatGPT 無法登入怎麼辦？5 個排解步驟" />);

    expect(screen.getByLabelText("網址代稱")).toHaveValue("chatgpt-無法登入怎麼辦-5-個排解步驟");
  });

  it("generates a slug from the title until the slug is manually edited", () => {
    render(<TitleSlugFields />);
    const title = screen.getByLabelText("標題");
    const slug = screen.getByLabelText("網址代稱");

    fireEvent.change(title, { target: { value: "ChatGPT 無法登入？完整解法" } });
    expect(slug).toHaveValue("chatgpt-無法登入-完整解法");

    fireEvent.change(slug, { target: { value: "custom-slug" } });
    fireEvent.change(title, { target: { value: "另一個標題" } });
    expect(slug).toHaveValue("custom-slug");
  });
});
