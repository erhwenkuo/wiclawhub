import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Spinner } from "@/components/Spinner";
import { TagBadge } from "@/components/TagBadge";
import { ErrorMessage } from "@/components/ErrorMessage";

describe("Spinner", () => {
  it("renders a spinning element", () => {
    const { container } = render(<Spinner />);
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });
});

describe("TagBadge", () => {
  it("renders the label text", () => {
    render(<TagBadge label="python" />);
    expect(screen.getByText("python")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(<TagBadge label="test" className="mt-2" />);
    const badge = screen.getByText("test");
    expect(badge.className).toContain("mt-2");
  });
});

describe("ErrorMessage", () => {
  it("renders default message", () => {
    render(<ErrorMessage />);
    expect(screen.getByText("Something went wrong.")).toBeInTheDocument();
  });

  it("renders custom message", () => {
    render(<ErrorMessage message="Custom error" />);
    expect(screen.getByText("Custom error")).toBeInTheDocument();
  });

  it("renders retry button when retry prop is provided", () => {
    const retry = vi.fn();
    render(<ErrorMessage retry={retry} />);
    const button = screen.getByText("Try again");
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(retry).toHaveBeenCalledOnce();
  });

  it("does not render retry button when no retry prop", () => {
    render(<ErrorMessage />);
    expect(screen.queryByText("Try again")).not.toBeInTheDocument();
  });
});
