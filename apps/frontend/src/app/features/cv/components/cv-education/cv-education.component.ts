import { Component, Input } from '@angular/core';
import { CvSvgComponent } from '@frontend/app/features/cv/components/cv-svg/cv-svg.component';
import { CvEducation, DEFAULT_CV_EDUCATION } from '@shared/cv';

@Component({
  selector: 'app-cv-education',
  standalone: true,
  imports: [CvSvgComponent],
  templateUrl: './cv-education.component.html',
  styleUrl: './cv-education.component.scss',
})
export class CvEducationComponent {
  @Input() education: CvEducation = DEFAULT_CV_EDUCATION;
}