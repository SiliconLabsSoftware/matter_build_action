# Set build argument for base image version
ARG VERSION=latest
ARG SISDK_Tag
ARG WiFI_SDK_Tag

# Stage 1: Build dependencies and download SDKs/tools
FROM ghcr.io/project-chip/chip-build:${VERSION} AS build
LABEL org.opencontainers.image.source https://github.com/project-chip/connectedhomeip

# Accept build arguments in this stage
ARG SISDK_Tag
ARG WiFI_SDK_Tag

# Install required packages for cloning and extracting SDKs
RUN set -x \
    && apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -fy --no-install-recommends \
    git \
    git-lfs \
    zip \
    tar \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/ \
    && : # last line

# Download and extract Simplicity SDK using SISDK_Tag, remove unused protocols
RUN wget https://github.com/SiliconLabs/simplicity_sdk/releases/download/${SISDK_Tag}/simplicity-sdk.zip -O /tmp/simplicity_sdk.zip \
    && echo "=== Download complete ===" \
    && ls -lh /tmp/simplicity_sdk.zip \
    && echo "=== Disk space before unzip ===" \
    && df -h \
    && echo "=== Starting unzip ===" \
    && unzip /tmp/simplicity_sdk.zip -d /tmp/simplicity_sdk \
    && rm -rf /tmp/simplicity_sdk.zip \
    && rm -rf /tmp/simplicity_sdk/protocol/flex /tmp/simplicity_sdk/protocol/z-wave /tmp/simplicity_sdk/protocol/wisun \
    && find /tmp/simplicity_sdk/protocol/openthread -name "*efr32mg21*" -delete \
    && : # last line

# Clone WiSeConnect Wi-Fi and Bluetooth Software 2.11.4 (bf6b600)
RUN git clone --depth=1 --single-branch --branch=2.11.4 https://github.com/SiliconLabs/wiseconnect-wifi-bt-sdk.git /tmp/wiseconnect-wifi-bt-sdk \
    && cd /tmp/wiseconnect-wifi-bt-sdk \
    && rm -rf .git \
    && : # last line

# Clone WiSeConnect SDK using WiFI_SDK_Tag
RUN git clone --depth=1 --single-branch --branch=${WiFI_SDK_Tag} https://github.com/SiliconLabs/wiseconnect.git /tmp/wifi_sdk \
    && cd /tmp/wifi_sdk \
    && rm -rf .git \
    && : # last line

# Download and extract SLC CLI
RUN wget https://www.silabs.com/documents/login/software/slc_cli_linux.zip \
    && unzip ./slc_cli_linux.zip -d /tmp \
    && rm ./slc_cli_linux.zip \
    && : # last line

# Download and extract Simplicity Commander
RUN wget https://www.silabs.com/documents/public/software/SimplicityCommander-Linux.zip \
    && unzip ./SimplicityCommander-Linux.zip -d /tmp/simplicity-commander \
    && rm ./SimplicityCommander-Linux.zip \
    && FILE=$(find /tmp/simplicity-commander -name "*Commander_linux_x86_64*") \
    && if [ -n "$FILE" ]; then \
    tar -xjvf "$FILE" -C /tmp/simplicity-commander; \
    else \
    echo "File not found"; \
    fi \
    && : # last line

# Download and extract ARM GCC toolchain v12.2.rel1
RUN wget https://developer.arm.com/-/media/Files/downloads/gnu/12.2.rel1/binrel/arm-gnu-toolchain-12.2.rel1-x86_64-arm-none-eabi.tar.xz -O /tmp/arm-gnu-toolchain.tar.xz \
    && tar -xJvf /tmp/arm-gnu-toolchain.tar.xz -C /tmp \
    && rm -rf /tmp/arm-gnu-toolchain.tar.xz \
    && : # last line

# Download and extract Amazon Corretto Java 21
RUN wget https://corretto.aws/downloads/resources/21.0.7.6.1/amazon-corretto-21.0.7.6.1-linux-x64.tar.gz -O /tmp/java.tar.gz \
    && tar -xzf /tmp/java.tar.gz -C /tmp \
    && rm /tmp/java.tar.gz \
    && ls /tmp \
    && : # last line

# Stage 2: Final image for SDK compilation
FROM ghcr.io/project-chip/chip-build:${VERSION}

# Add Python requirements
ADD docker/requirements.txt /tmp/requirements.txt

# Set environment variables for SDKs and tools
ENV GSDK_ROOT=/opt/silabs/simplicity_sdk/
ENV SISDK_ROOT=/opt/silabs/simplicity_sdk/
ENV WISECONNECT_SDK_ROOT=/opt/silabs/wiseconnect-wifi-bt-sdk/
ENV WISECONNECT3_DIR=${SISDK_ROOT}/extension/wiseconnect
ENV ARM_GCC_DIR=/opt/arm-gcc
ENV JAVA21_HOME=/opt/silabs/amazon-corretto-21.0.7.6.1-linux-x64
ENV PATH="${PATH}:/opt/silabs/slc_cli/"
ENV PATH="${PATH}:${ARM_GCC_DIR}/bin"
ENV PATH="${PATH}:${JAVA21_HOME}/bin"
ENV POST_BUILD_EXE=/opt/silabs/simplicity-commander/commander/commander

# Copy SDKs and tools from build stage to final image
COPY --from=build /tmp/simplicity_sdk ${SISDK_ROOT}
COPY --from=build /tmp/wiseconnect-wifi-bt-sdk/ ${WISECONNECT_SDK_ROOT}
COPY --from=build /tmp/wifi_sdk ${WISECONNECT3_DIR}
COPY --from=build /tmp/slc_cli /opt/silabs/slc_cli
COPY --from=build /tmp/simplicity-commander /opt/silabs/simplicity-commander
COPY --from=build /tmp/arm-gnu-toolchain-* ${ARM_GCC_DIR}
COPY --from=build /tmp/amazon-corretto-21.0.7.6.1-linux-x64 ${JAVA21_HOME}