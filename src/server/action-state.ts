/// Shape returned by every server action driving a `useActionState` form.
/// `error` is a message key resolved against the `Errors` namespace.
export type ActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
};

export const initialActionState: ActionState = {};

export function failure(error: string): ActionState {
  return { error };
}

export function fieldFailure(fieldErrors: Record<string, string>): ActionState {
  return { error: "invalidInput", fieldErrors };
}
