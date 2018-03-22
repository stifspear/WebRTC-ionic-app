import { NgModule } from '@angular/core';
import { ToggleCameraComponent } from './toggle-camera/toggle-camera';
import { ChatComponent } from './chat/chat';
@NgModule({
	declarations: [ToggleCameraComponent,
    ChatComponent],
	imports: [],
	exports: [ToggleCameraComponent,
    ChatComponent]
})
export class ComponentsModule {}
