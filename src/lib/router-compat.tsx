/**
 * Compatibility shim — exposes a TanStack-Router-like API on top of react-router-dom.
 * Allows the codebase migrated from TanStack Start to keep using:
 *   - <Link to="/x" params={{...}} activeProps={{...}} activeOptions={{exact}}>
 *   - useNavigate()({ to: "/x", params: {...} })
 *   - useParams<{id: string}>()
 *   - useLocation()
 */
import * as React from "react";
import {
  Link as RRLink,
  NavLink,
  useNavigate as useRRNavigate,
  useParams as useRRParams,
  useLocation as useRRLocation,
  type LinkProps as RRLinkProps,
} from "react-router-dom";

function buildPath(to: string, params?: Record<string, string | number>): string {
  if (!params) return to;
  let out = to;
  for (const [k, v] of Object.entries(params)) {
    out = out.replace(`$${k}`, String(v)).replace(`:${k}`, String(v));
  }
  return out;
}

export interface ActiveProps {
  className?: string;
  style?: React.CSSProperties;
}

export interface LinkProps extends Omit<RRLinkProps, "to"> {
  to: string;
  params?: Record<string, string | number>;
  activeOptions?: { exact?: boolean };
  activeProps?: ActiveProps;
}

export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { to, params, activeOptions, activeProps, className, style, children, ...rest },
  ref,
) {
  const path = buildPath(to, params);
  if (activeProps) {
    return (
      <NavLink
        ref={ref}
        to={path}
        end={activeOptions?.exact}
        className={({ isActive }) => {
          const base = typeof className === "string" ? className : "";
          return isActive ? activeProps.className ?? base : base;
        }}
        style={({ isActive }) =>
          isActive && activeProps.style ? { ...(style as React.CSSProperties), ...activeProps.style } : (style as React.CSSProperties | undefined)
        }
        {...rest}
      >
        {children}
      </NavLink>
    );
  }
  return (
    <RRLink ref={ref} to={path} className={className as string | undefined} style={style} {...rest}>
      {children}
    </RRLink>
  );
});

export type NavigateArg =
  | string
  | { to: string; params?: Record<string, string | number>; replace?: boolean };

export function useNavigate(): (arg: NavigateArg) => void {
  const navigate = useRRNavigate();
  return React.useCallback(
    (arg: NavigateArg) => {
      if (typeof arg === "string") {
        navigate(arg);
        return;
      }
      navigate(buildPath(arg.to, arg.params), { replace: arg.replace });
    },
    [navigate],
  );
}

export function useParams<T extends Record<string, string | undefined> = Record<string, string | undefined>>(): T {
  return useRRParams() as T;
}

export const useLocation = useRRLocation;

// Outlet re-export so layouts work the same way
export { Outlet } from "react-router-dom";
