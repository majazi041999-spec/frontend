import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function ConfirmDialog({
                                  open,
                                  onOpenChange,
                                  title,
                                  description,
                                  confirmText = "بله، انجام بده",
                                  cancelText = "انصراف",
                                  destructive = true,
                                  loading = false,
                                  onConfirm,
                              }: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    title: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
    destructive?: boolean;
    loading?: boolean;
    onConfirm: () => void | Promise<void>;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[520px]">
                <DialogHeader className="text-right">
                    <DialogTitle>{title}</DialogTitle>
                    {description ? <DialogDescription className="text-right">{description}</DialogDescription> : null}
                </DialogHeader>

                <DialogFooter>
                    <Button
                        variant="outline"
                        className="rounded-2xl"
                        onClick={() => onOpenChange(false)}
                        disabled={loading}
                    >
                        {cancelText}
                    </Button>

                    <Button
                        variant={destructive ? "destructive" : "default"}
                        className="rounded-2xl"
                        onClick={onConfirm}
                        disabled={loading}
                    >
                        {confirmText}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
