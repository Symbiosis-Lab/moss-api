[@symbiosis-lab/moss-api](../../README.md) / [index](../README.md) / HookResult

# Interface: HookResult

Standard result returned from hook execution

## Design Principles

1. **Single completion path**: Return value only, no explicit reporting
2. **Flow control only**: HookResult tells moss success/failure
3. **Decoupled UX**: Plugins call showToast() separately for notifications

## Usage Pattern

```typescript
async function deploy(context): Promise<HookResult> {
  // Do work...

  // Show toast (plugin's choice of timing, message, style)
  await showToast({ message: "Deployed!", variant: "success" });

  // Return result (flow control only, no UX)
  return { success: true, deployment: {...} };
}
```

## Properties

### deployment?

```ts
optional deployment?: DeploymentInfo;
```

Deployment info (populated by deploy hooks)

***

### message?

```ts
optional message?: string;
```

Detailed message for logs/debugging

***

### success

```ts
success: boolean;
```

Whether the operation succeeded
